import type { Category, DateKey } from '@/db/types'
import { fmt, minToHHMM } from './date'
import type { Occurrence } from './schedule'

const W = 1080
const PAD = 72

/** Gambar jadwal satu hari (PNG) — untuk dikirim ke pasangan / story */
export async function renderDayImage(date: DateKey, items: Occurrence[], categories: Map<string, Category>, name?: string): Promise<Blob> {
  const rows = items.length
  const H = Math.max(1350, 420 + rows * 112 + 140)
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  await document.fonts?.ready

  // latar aurora
  g.fillStyle = '#07070f'
  g.fillRect(0, 0, W, H)
  const blob = (x: number, y: number, r: number, col: string) => {
    const grad = g.createRadialGradient(x, y, 0, x, y, r)
    grad.addColorStop(0, col)
    grad.addColorStop(1, 'transparent')
    g.fillStyle = grad
    g.fillRect(0, 0, W, H)
  }
  blob(180, 120, 620, 'rgba(109,74,255,0.45)')
  blob(980, 360, 560, 'rgba(14,165,198,0.35)')
  blob(500, H - 80, 640, 'rgba(16,185,129,0.25)')

  const display = '600 64px "Space Grotesk Variable", system-ui, sans-serif'
  const body = (w: number, s: number) => `${w} ${s}px "Plus Jakarta Sans Variable", system-ui, sans-serif`

  g.fillStyle = '#a7a6c2'
  g.font = body(500, 34)
  g.fillText(name ? `Jadwal ${name}` : 'Jadwalku', PAD, 140)
  g.fillStyle = '#f2f1fb'
  g.font = display
  g.fillText(fmt(date, 'EEEE, d MMMM'), PAD, 220)

  let y = 300
  if (!rows) {
    g.fillStyle = '#a7a6c2'
    g.font = body(400, 38)
    g.fillText('Hari ini kosong — bebas! ✨', PAD, y + 60)
  }
  for (const o of items) {
    const cat = categories.get(o.categoryId)
    const col = cat?.color ?? '#94a3b8'
    // kartu kaca
    g.fillStyle = 'rgba(255,255,255,0.06)'
    g.beginPath()
    g.roundRect(PAD, y, W - PAD * 2, 92, 28)
    g.fill()
    g.fillStyle = col
    g.beginPath()
    g.roundRect(PAD, y, 12, 92, 6)
    g.fill()
    g.fillStyle = '#a7a6c2'
    g.font = body(600, 30)
    g.fillText(`${minToHHMM(o.start)}–${minToHHMM(o.end)}`, PAD + 40, y + 57)
    g.fillStyle = '#f2f1fb'
    g.font = body(600, 36)
    let title = o.title
    const maxW = W - PAD * 2 - 300
    while (g.measureText(title).width > maxW && title.length > 4) title = title.slice(0, -2)
    if (title !== o.title) title = title.trimEnd() + '…'
    g.fillText(title, PAD + 270, y + 58)
    y += 112
  }

  g.fillStyle = '#6c6b8a'
  g.font = body(500, 28)
  g.fillText('dibuat dengan Ritme', PAD, H - 64)

  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('gagal membuat gambar'))), 'image/png'))
}

/** Kartu Ritme Wrapped (PNG 1080×1350) */
export async function renderWrappedImage(monthLabel: string, slides: { big: string; label: string; sub?: string }[], name?: string): Promise<Blob> {
  const H = 1350
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  await document.fonts?.ready
  g.fillStyle = '#07070f'
  g.fillRect(0, 0, W, H)
  const glow = (x: number, y: number, r: number, col: string) => {
    const grad = g.createRadialGradient(x, y, 0, x, y, r)
    grad.addColorStop(0, col)
    grad.addColorStop(1, 'transparent')
    g.fillStyle = grad
    g.fillRect(0, 0, W, H)
  }
  glow(900, 160, 700, 'rgba(139,123,255,0.5)')
  glow(120, 900, 640, 'rgba(34,211,238,0.35)')
  glow(700, 1300, 600, 'rgba(244,114,182,0.3)')

  const body = (w: number, s: number) => `${w} ${s}px "Plus Jakarta Sans Variable", system-ui, sans-serif`
  const disp = (s: number) => `600 ${s}px "Space Grotesk Variable", system-ui, sans-serif`
  g.fillStyle = '#a7a6c2'
  g.font = body(600, 34)
  g.fillText(`RITME WRAPPED${name ? ` · ${name.toUpperCase()}` : ''}`, PAD, 130)
  g.fillStyle = '#f2f1fb'
  g.font = disp(84)
  g.fillText(monthLabel, PAD, 230)

  let y = 330
  for (const s of slides) {
    g.fillStyle = 'rgba(255,255,255,0.06)'
    g.beginPath()
    g.roundRect(PAD, y, W - PAD * 2, 150, 32)
    g.fill()
    g.fillStyle = '#a7a6c2'
    g.font = body(600, 26)
    g.fillText(s.label.toUpperCase(), PAD + 36, y + 50)
    g.fillStyle = '#f2f1fb'
    g.font = disp(56)
    let big = s.big
    while (g.measureText(big).width > W - PAD * 2 - 72 && big.length > 4) big = big.slice(0, -2)
    if (big !== s.big) big = big.trimEnd() + '…'
    g.fillText(big, PAD + 36, y + 118)
    y += 166
  }
  g.fillStyle = '#6c6b8a'
  g.font = body(500, 28)
  g.fillText('dibuat dengan Ritme', PAD, H - 60)
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('gagal membuat gambar'))), 'image/png'))
}

/** Bagikan file lewat menu share HP; cadangan: unduh */
export async function shareOrDownload(file: File, text?: string) {
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text })
      return 'shared' as const
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled' as const
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
  return 'downloaded' as const
}
