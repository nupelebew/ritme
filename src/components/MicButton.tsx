import { useRef, useState } from 'react'
import { Mic, MicOff } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useToast } from './Toast'

interface Recognition {
  lang: string
  interimResults: boolean
  continuous: boolean
  start: () => void
  stop: () => void
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}

const Ctor = () =>
  typeof window === 'undefined'
    ? undefined
    : ((window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition)

export const voiceSupported = () => !!Ctor()

/**
 * Tombol dikte suara (bahasa Indonesia). Catatan: di Chrome, pengenalan suara diproses server Google,
 * jadi butuh internet. Tombol disembunyikan bila browser tidak mendukung.
 */
export function MicButton({ onText, className, label = 'Ucapkan' }: { onText: (text: string) => void; className?: string; label?: string }) {
  const [on, setOn] = useState(false)
  const rec = useRef<Recognition | null>(null)
  const toast = useToast()
  const C = Ctor()
  if (!C) return null

  const toggle = () => {
    if (on) {
      rec.current?.stop()
      return
    }
    if (!navigator.onLine) {
      toast({ text: 'Dikte suara butuh internet. Ketik saja dulu ya.', tone: 'error' })
      return
    }
    const r = new C()
    r.lang = 'id-ID'
    r.interimResults = false
    r.continuous = false
    r.onresult = (e) => {
      const text = Array.from(e.results)
        .map((x) => x[0]?.transcript ?? '')
        .join(' ')
        .trim()
      if (text) onText(text)
    }
    r.onerror = (e) => {
      if (e.error === 'not-allowed') toast({ text: 'Izin mikrofon ditolak.', tone: 'error' })
      else if (e.error !== 'aborted' && e.error !== 'no-speech') toast({ text: 'Suara tidak tertangkap, coba lagi.', tone: 'error' })
    }
    r.onend = () => setOn(false)
    rec.current = r
    setOn(true)
    r.start()
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? 'Berhenti mendengarkan' : label}
      title={on ? 'Berhenti' : label}
      className={cn(
        'grid size-11 shrink-0 place-items-center rounded-2xl transition',
        on ? 'animate-pulse bg-danger/20 text-danger' : 'text-muted hover:bg-white/8 hover:text-ink',
        className,
      )}
    >
      {on ? <MicOff className="size-5" aria-hidden /> : <Mic className="size-5" aria-hidden />}
    </button>
  )
}
