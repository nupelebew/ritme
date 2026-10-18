import type { DateKey } from '@/db/types'
import { shiftKey } from './date'

export type Interval = [number, number]
export interface DayBusy {
  date: DateKey
  busy: Interval[]
}

/** Gabungkan interval yang bertumpuk/bersentuhan */
export function merge(iv: Interval[]): Interval[] {
  const s = [...iv].sort((a, b) => a[0] - b[0])
  const out: Interval[] = []
  for (const [a, b] of s) {
    const last = out[out.length - 1]
    if (last && a <= last[1]) last[1] = Math.max(last[1], b)
    else out.push([a, b])
  }
  return out
}

const PREFIX = 'RITME1'

/**
 * Kode jadwal sibuk yang ringkas untuk QR / dikirim lewat chat.
 * Format: RITME1|<tanggal awal>|<nama>|<hari0>;<hari1>;… dengan tiap hari "a-b,c-d" (satuan 15 menit, base36).
 * Isi kegiatannya tidak ikut — hanya kapan sibuk.
 */
export function encodeBusy(days: DayBusy[], name: string) {
  if (!days.length) return `${PREFIX}||${name}|`
  const q = (m: number) => Math.round(m / 15).toString(36)
  const body = days.map((d) => merge(d.busy).map(([a, b]) => `${q(a)}-${q(b)}`).join(',')).join(';')
  return `${PREFIX}|${days[0].date}|${name.replace(/[|;]/g, ' ').slice(0, 24)}|${body}`
}

export function decodeBusy(code: string): { name: string; days: DayBusy[] } | null {
  const parts = code.trim().split('|')
  if (parts[0] !== PREFIX || parts.length !== 4 || !/^\d{4}-\d{2}-\d{2}$/.test(parts[1])) return null
  const [, start, name, body] = parts
  const days = body.split(';').map((d, k) => ({
    date: shiftKey(start, k),
    busy: d
      ? d.split(',').map((seg) => {
          const [a, b] = seg.split('-').map((x) => parseInt(x, 36) * 15)
          return [a, b] as Interval
        })
      : [],
  }))
  if (days.some((d) => d.busy.some(([a, b]) => Number.isNaN(a) || Number.isNaN(b) || b < a))) return null
  return { name, days }
}

/** Slot kosong bersama di tiap tanggal yang ada di kedua jadwal, dalam jam aktif [from, to) */
export function freeTogether(mine: DayBusy[], theirs: DayBusy[], from = 7 * 60, to = 22 * 60, minLen = 60) {
  const out: { date: DateKey; slots: Interval[] }[] = []
  for (const a of mine) {
    const b = theirs.find((x) => x.date === a.date)
    if (!b) continue
    const busy = merge([...a.busy, ...b.busy])
    const slots: Interval[] = []
    let cur = from
    for (const [s, e] of busy) {
      if (e <= cur) continue
      if (s >= to) break
      if (s - cur >= minLen) slots.push([cur, Math.min(s, to)])
      cur = Math.max(cur, e)
    }
    if (to - cur >= minLen) slots.push([cur, to])
    if (slots.length) out.push({ date: a.date, slots })
  }
  return out
}
