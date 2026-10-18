import { addDays, format, parseISO } from 'date-fns'
import { id } from 'date-fns/locale'
import type { DateKey } from '@/db/types'

export const toKey = (d: Date): DateKey => format(d, 'yyyy-MM-dd')
export const fromKey = (k: DateKey): Date => parseISO(k)
export const todayKey = () => toKey(new Date())
export const shiftKey = (k: DateKey, n: number) => toKey(addDays(fromKey(k), n))

export const fmt = (d: Date | DateKey, pattern: string) =>
  format(typeof d === 'string' ? fromKey(d) : d, pattern, { locale: id })

/** Menit sejak tengah malam untuk waktu sekarang */
export const nowMinutes = (d = new Date()) => d.getHours() * 60 + d.getMinutes()

/** 615 -> "10:15" */
export const minToHHMM = (m: number) => {
  const h = Math.floor(m / 60) % 24
  const mm = Math.round(m % 60)
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

/** "10:15" -> 615. Mengembalikan NaN bila format salah. */
export const hhmmToMin = (s: string) => {
  const m = /^(\d{1,2})[:.](\d{2})$/.exec(s.trim())
  if (!m) return NaN
  const h = Number(m[1])
  const mm = Number(m[2])
  if (h > 24 || mm > 59 || (h === 24 && mm > 0)) return NaN
  return h * 60 + mm
}

export const durationLabel = (min: number) => {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  if (!h) return `${m} mnt`
  return m ? `${h} j ${m} mnt` : `${h} jam`
}

export const greeting = (d = new Date()) => {
  const h = d.getHours()
  if (h < 4) return 'Masih melek?'
  if (h < 11) return 'Selamat pagi'
  if (h < 15) return 'Selamat siang'
  if (h < 18) return 'Selamat sore'
  return 'Selamat malam'
}
