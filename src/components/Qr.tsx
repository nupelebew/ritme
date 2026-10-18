import { useEffect, useMemo, useRef, useState } from 'react'
import qrcode from 'qrcode-generator'

/** Kode QR sebagai SVG (dibuat lokal, tanpa internet). Selalu gelap-di-atas-terang supaya mudah dipindai. */
export function QrCode({ text, label }: { text: string; label: string }) {
  const svg = useMemo(() => {
    const qr = qrcode(0, 'M')
    qr.addData(text, 'Byte')
    qr.make()
    return qr.createSvgTag({ cellSize: 4, margin: 3, scalable: true })
  }, [text])
  return <div role="img" aria-label={label} className="mx-auto aspect-square w-full max-w-[260px] rounded-2xl bg-white p-2 [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} />
}

type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> }

/**
 * Pemindai QR pakai kamera. Memakai BarcodeDetector bawaan browser bila ada (Chrome Android),
 * selain itu memuat jsQR (hanya saat dibutuhkan).
 */
export function QrScanner({ onResult, accept }: { onResult: (text: string) => void; accept: (text: string) => boolean }) {
  const video = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')
  const done = useRef(false)

  useEffect(() => {
    let stream: MediaStream | undefined
    let raf = 0
    let alive = true
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      } catch {
        setError('Kamera tidak bisa dibuka. Izinkan akses kamera, atau pakai "Tempel kode" di bawah.')
        return
      }
      if (!alive || !video.current) return
      video.current.srcObject = stream
      await video.current.play().catch(() => {})

      const Native = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector
      const detector = Native ? new Native({ formats: ['qr_code'] }) : null
      const jsQR = detector ? null : (await import('jsqr')).default

      const tick = async () => {
        if (!alive || done.current || !video.current) return
        const v = video.current
        if (v.readyState >= 2) {
          let text: string | undefined
          if (detector) text = (await detector.detect(v).catch(() => []))[0]?.rawValue
          else if (jsQR && ctx) {
            canvas.width = v.videoWidth
            canvas.height = v.videoHeight
            ctx.drawImage(v, 0, 0)
            text = jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height)?.data
          }
          if (text && accept(text)) {
            done.current = true
            navigator.vibrate?.(30)
            onResult(text)
            return
          }
        }
        raf = requestAnimationFrame(() => void tick())
      }
      void tick()
    })()

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [accept, onResult])

  return (
    <div className="space-y-2">
      <div className="relative mx-auto aspect-square w-full max-w-[280px] overflow-hidden rounded-2xl bg-black">
        <video ref={video} className="size-full object-cover" playsInline muted />
        <div className="pointer-events-none absolute inset-[15%] rounded-2xl border-2 border-white/80 shadow-[0_0_0_999px_rgb(0_0_0/0.35)]" aria-hidden />
      </div>
      {error ? <p className="text-center text-sm text-danger">{error}</p> : <p className="text-center text-xs text-muted">Arahkan kamera ke kode QR pasanganmu.</p>}
    </div>
  )
}
