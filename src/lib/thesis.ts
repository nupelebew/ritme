import { differenceInCalendarDays } from 'date-fns'
import type { DateKey, FocusSession, Milestone, Task } from '@/db/types'
import { fromKey } from './date'

/** Template milestone skripsi umum (bisa diubah setelah dipakai) */
export const THESIS_TEMPLATE = [
  'Bab 1 · Pendahuluan',
  'Bab 2 · Tinjauan pustaka',
  'Bab 3 · Metodologi',
  'Seminar proposal',
  'Pengambilan & olah data',
  'Bab 4 · Hasil & pembahasan',
  'Bab 5 · Kesimpulan & saran',
  'Sidang',
]

export function progress(milestones: Milestone[]) {
  const total = milestones.length
  const done = milestones.filter((m) => m.done).length
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 }
}

/** Menit fokus per milestone (lewat tugas yang tertaut) */
export function focusPerMilestone(sessions: FocusSession[], tasks: Task[]) {
  const taskMs = new Map(tasks.filter((t) => t.milestoneId).map((t) => [t.id, t.milestoneId!]))
  const out = new Map<string, number>()
  for (const s of sessions) {
    const m = s.taskId ? taskMs.get(s.taskId) : undefined
    if (m) out.set(m, (out.get(m) ?? 0) + s.durationMin)
  }
  return out
}

export function countdown(target: DateKey | undefined, today: DateKey) {
  if (!target) return null
  const days = differenceInCalendarDays(fromKey(target), fromKey(today))
  if (days < 0) return { days, label: `${-days} hari lalu` }
  if (days === 0) return { days, label: 'Hari ini!' }
  if (days < 14) return { days, label: `${days} hari lagi` }
  const w = Math.floor(days / 7)
  return { days, label: `${w} minggu ${days % 7 ? `${days % 7} hari ` : ''}lagi` }
}

/**
 * Laju yang dibutuhkan: milestone tersisa dibagi minggu tersisa sampai sidang.
 * Membantu menjawab "aman nggak sih?".
 */
export function pace(milestones: Milestone[], target: DateKey | undefined, today: DateKey) {
  const left = milestones.filter((m) => !m.done).length
  const c = countdown(target, today)
  if (!c || c.days <= 0 || !left) return null
  const weeks = Math.max(1, c.days / 7)
  return { left, perWeek: Math.round((left / weeks) * 10) / 10 }
}
