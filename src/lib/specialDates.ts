import { differenceInCalendarDays } from 'date-fns'
import type { DateKey, SpecialDate } from '@/db/types'
import { fromKey } from './date'

/** Kapan tanggal penting ini jatuh berikutnya (dari hari ini) */
export function nextOccurrence(s: Pick<SpecialDate, 'date' | 'yearly'>, today: DateKey) {
  if (!s.yearly) {
    const days = differenceInCalendarDays(fromKey(s.date), fromKey(today))
    return { date: s.date, days, years: 0 }
  }
  const [y0, m, d] = s.date.split('-').map(Number)
  const ty = Number(today.slice(0, 4))
  for (const y of [ty, ty + 1]) {
    // 29 Feb di tahun bukan kabisat → 28 Feb
    const lastDay = new Date(y, m, 0).getDate()
    const key = `${y}-${String(m).padStart(2, '0')}-${String(Math.min(d, lastDay)).padStart(2, '0')}`
    const days = differenceInCalendarDays(fromKey(key), fromKey(today))
    if (days >= 0) return { date: key, days, years: y - y0 }
  }
  return { date: s.date, days: 0, years: 0 }
}

export const daysLabel = (n: number) => (n === 0 ? 'Hari ini! 🎉' : n === 1 ? 'Besok' : n < 0 ? `${-n} hari lalu` : `${n} hari lagi`)
