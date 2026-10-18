import type { DateKey, Recurrence, ScheduleEvent, Weekday } from '@/db/types'
import { fromKey } from './date'

/** Satu kejadian di tanggal tertentu. Untuk seri berulang, `masterId` menunjuk ke induknya. */
export interface Occurrence extends ScheduleEvent {
  key: string
  masterId?: string
}

export const weekdayOf = (k: DateKey) => fromKey(k).getDay() as Weekday

export function occursOn(ev: ScheduleEvent, date: DateKey): boolean {
  const r = ev.recurrence
  if (!r) return ev.date === date
  if (date < ev.date) return false
  if (r.until && date > r.until) return false
  if (ev.exceptions?.includes(date)) return false
  if (r.freq === 'daily') return true
  const days = r.days?.length ? r.days : [weekdayOf(ev.date)]
  return days.includes(weekdayOf(date))
}

/** Gabungkan kegiatan tunggal + seri berulang menjadi daftar kejadian di satu tanggal, urut waktu. */
export function expandForDate(events: ScheduleEvent[], date: DateKey): Occurrence[] {
  const out: Occurrence[] = []
  for (const ev of events) {
    if (!occursOn(ev, date)) continue
    if (ev.recurrence) out.push({ ...ev, date, key: `${ev.id}@${date}`, masterId: ev.id })
    else out.push({ ...ev, key: ev.id })
  }
  return out.sort((a, b) => a.start - b.start || b.end - a.end)
}

export interface Placed<T> {
  item: T
  col: number
  cols: number
}

/** Atur kolom untuk blok yang waktunya bertabrakan (seperti kalender pada umumnya). */
export function layoutColumns<T extends { start: number; end: number }>(items: T[]): Placed<T>[] {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end)
  const result: Placed<T>[] = []
  let cluster: Placed<T>[] = []
  let colEnds: number[] = []
  let clusterEnd = -1

  const flush = () => {
    const n = colEnds.length
    for (const p of cluster) p.cols = n
    result.push(...cluster)
    cluster = []
    colEnds = []
  }

  for (const it of sorted) {
    if (cluster.length && it.start >= clusterEnd) flush()
    let col = colEnds.findIndex((end) => end <= it.start)
    if (col === -1) {
      col = colEnds.length
      colEnds.push(it.end)
    } else colEnds[col] = it.end
    cluster.push({ item: it, col, cols: 1 })
    clusterEnd = cluster.length === 1 ? it.end : Math.max(clusterEnd, it.end)
  }
  if (cluster.length) flush()
  return result
}

export const snap = (min: number, step = 15) => Math.round(min / step) * step

export const recurrenceLabel = (r?: Recurrence) => {
  if (!r) return 'Sekali'
  if (r.freq === 'daily') return 'Setiap hari'
  const d = [...(r.days ?? [])].sort()
  if (d.join() === '1,2,3,4,5') return 'Hari kerja'
  if (d.join() === '0,6') return 'Akhir pekan'
  const names = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
  return 'Setiap ' + d.map((x) => names[x]).join(', ')
}
