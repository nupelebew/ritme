import type { DateKey, Habit } from '@/db/types'
import { shiftKey, toKey } from './date'
import { weekdayOf } from './schedule'

/** Apakah kebiasaan dijadwalkan pada tanggal ini (dan sudah dibuat saat itu) */
export function isDue(h: Habit, date: DateKey) {
  if (date < toKey(new Date(h.createdAt))) return false
  return !h.days?.length || h.days.includes(weekdayOf(date))
}

/**
 * Streak berjalan: hitung mundur hari terjadwal yang tercentang berturut-turut.
 * Hari tak terjadwal dilewati. Hari ini yang belum dicentang tidak memutus streak.
 */
export function currentStreak(h: Habit, done: Set<DateKey>, today: DateKey) {
  let n = 0
  let d = today
  if (!done.has(today)) d = shiftKey(today, -1)
  for (let i = 0; i < 3660; i++, d = shiftKey(d, -1)) {
    if (!isDue(h, d)) {
      if (d < toKey(new Date(h.createdAt))) break
      continue
    }
    if (!done.has(d)) break
    n++
  }
  return n
}

/** Streak terpanjang sepanjang riwayat */
export function longestStreak(h: Habit, done: Set<DateKey>, today: DateKey) {
  let best = 0
  let run = 0
  let d = toKey(new Date(h.createdAt))
  // juga hitung log yang lebih tua dari createdAt (mis. hasil impor)
  const earliest = [...done].sort()[0]
  if (earliest && earliest < d) d = earliest
  for (; d <= today; d = shiftKey(d, 1)) {
    const due = !h.days?.length || h.days.includes(weekdayOf(d))
    if (!due) continue
    if (done.has(d)) best = Math.max(best, ++run)
    else if (d !== today) run = 0
  }
  return best
}

/** Persentase hari terjadwal yang tercentang dalam N hari terakhir (termasuk hari ini) */
export function completionRate(h: Habit, done: Set<DateKey>, today: DateKey, days = 30) {
  let due = 0
  let hit = 0
  for (let i = 0; i < days; i++) {
    const d = shiftKey(today, -i)
    if (!isDue(h, d)) continue
    if (d === today && !done.has(d)) continue
    due++
    if (done.has(d)) hit++
  }
  return due ? Math.round((hit / due) * 100) : 0
}

export const lastNDays = (today: DateKey, n = 30) => Array.from({ length: n }, (_, i) => shiftKey(today, i - n + 1))

export const logId = (habitId: string, date: DateKey) => `${habitId}_${date}`
