import type { RitmeDB } from './db'
import { eventsForDate } from './events'
import type { DateKey } from './types'
import { shiftKey } from '@/lib/date'
import { merge, type DayBusy } from '@/lib/together'

/**
 * Jam sibuk (dari jadwal) untuk N hari mulai `from`.
 * Bila `nowMin` diisi, waktu yang sudah lewat di hari pertama ikut dianggap sibuk.
 */
export async function busyDays(db: RitmeDB, from: DateKey, n = 7, nowMin?: number): Promise<DayBusy[]> {
  const days = Array.from({ length: n }, (_, i) => shiftKey(from, i))
  const occ = await Promise.all(days.map((d) => eventsForDate(db, d)))
  return days.map((date, i) => {
    const iv = occ[i].map((o) => [o.start, Math.min(o.end, 1440)] as [number, number])
    if (i === 0 && nowMin !== undefined) iv.push([0, Math.ceil(nowMin / 15) * 15])
    return { date, busy: merge(iv) }
  })
}
