import { addMonths, format, startOfMonth, startOfWeek } from 'date-fns'
import { id } from 'date-fns/locale'
import type { DateKey, FocusSession, Task } from '@/db/types'
import { fromKey, shiftKey, toKey } from './date'

export function focusByDate(sessions: FocusSession[]) {
  const m = new Map<DateKey, number>()
  for (const s of sessions) m.set(s.date, (m.get(s.date) ?? 0) + s.durationMin)
  return m
}

export function focusByCategory(sessions: FocusSession[]) {
  const m = new Map<string, number>()
  for (const s of sessions) m.set(s.categoryId ?? '?', (m.get(s.categoryId ?? '?') ?? 0) + s.durationMin)
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}

export interface Bucket {
  key: string
  label: string
  start: DateKey
  end: DateKey
  focusMin: number
  tasksDone: number
}

/** Tren: N minggu (Senin–Minggu) atau N bulan terakhir, termasuk periode berjalan */
export function trend(kind: 'week' | 'month', n: number, today: DateKey, sessions: FocusSession[], tasks: Task[]): Bucket[] {
  const out: Bucket[] = []
  const t = fromKey(today)
  for (let i = n - 1; i >= 0; i--) {
    let start: Date
    let end: DateKey
    if (kind === 'week') {
      start = startOfWeek(t, { weekStartsOn: 1 })
      start.setDate(start.getDate() - 7 * i)
      end = shiftKey(toKey(start), 6)
    } else {
      start = addMonths(startOfMonth(t), -i)
      end = shiftKey(toKey(addMonths(start, 1)), -1)
    }
    const s = toKey(start)
    out.push({
      key: s,
      label: kind === 'week' ? format(start, 'd MMM', { locale: id }) : format(start, 'MMM', { locale: id }),
      start: s,
      end,
      focusMin: 0,
      tasksDone: 0,
    })
  }
  for (const x of sessions) {
    const b = out.find((b) => x.date >= b.start && x.date <= b.end)
    if (b) b.focusMin += x.durationMin
  }
  for (const task of tasks) {
    if (!task.done || !task.doneAt) continue
    const d = toKey(new Date(task.doneAt))
    const b = out.find((b) => d >= b.start && d <= b.end)
    if (b) b.tasksDone++
  }
  return out
}

/** Kolom-kolom minggu (Senin di atas) untuk heatmap kalender, berakhir di minggu ini. Tanggal masa depan = null. */
export function heatmapColumns(today: DateKey, weeks: number): (DateKey | null)[][] {
  const lastMonday = toKey(startOfWeek(fromKey(today), { weekStartsOn: 1 }))
  const first = shiftKey(lastMonday, -7 * (weeks - 1))
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const k = shiftKey(first, w * 7 + d)
      return k > today ? null : k
    }),
  )
}

/** Tingkat intensitas 0–4 dengan ambang tetap supaya mudah dibaca */
export const LEVEL_LABELS = ['Tidak ada', '< 30 mnt', '30–59 mnt', '1–2 jam', '≥ 2 jam']
export function levelOf(min: number) {
  if (min <= 0) return 0
  if (min < 30) return 1
  if (min < 60) return 2
  if (min < 120) return 3
  return 4
}

/** Streak hari aktif (ada aktivitas) — berjalan & terpanjang */
export function dayStreaks(active: Set<DateKey>, today: DateKey) {
  let current = 0
  let d = active.has(today) ? today : shiftKey(today, -1)
  while (active.has(d)) {
    current++
    d = shiftKey(d, -1)
  }
  const sorted = [...active].sort()
  let longest = 0
  let run = 0
  let prev: DateKey | null = null
  for (const k of sorted) {
    run = prev && shiftKey(prev, 1) === k ? run + 1 : 1
    longest = Math.max(longest, run)
    prev = k
  }
  return { current, longest }
}
