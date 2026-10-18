import { differenceInCalendarDays } from 'date-fns'
import type { DateKey, Priority, Task } from '@/db/types'
import { fmt, fromKey } from './date'

export const PRIORITY: Record<Priority, { label: string; color: string; weight: number }> = {
  1: { label: 'Rendah', color: '#94a3b8', weight: 10 },
  2: { label: 'Sedang', color: '#22d3ee', weight: 25 },
  3: { label: 'Tinggi', color: '#f59e0b', weight: 45 },
  4: { label: 'Mendesak', color: '#fb7185', weight: 70 },
}

export const daysUntil = (due: DateKey, today: DateKey) => differenceInCalendarDays(fromKey(due), fromKey(today))

export interface Scored {
  task: Task
  score: number
  reasons: string[]
}

/**
 * Skor prioritas lokal (tanpa AI). Gabungan:
 * bobot prioritas + urgensi tenggat + momentum subtugas + usia tugas + bonus tugas cepat.
 */
export function scoreTask(task: Task, today: DateKey, now = Date.now()): Scored {
  const reasons: string[] = []
  let score = PRIORITY[task.priority].weight
  if (task.priority >= 3) reasons.push(`Prioritas ${PRIORITY[task.priority].label.toLowerCase()}`)

  if (task.due) {
    const d = daysUntil(task.due, today)
    if (d < 0) {
      score += Math.min(90, 60 + 5 * -d)
      reasons.push(d === -1 ? 'Lewat tenggat kemarin' : `Lewat tenggat ${-d} hari`)
    } else if (d === 0) {
      score += 50
      reasons.push('Tenggat hari ini')
    } else if (d === 1) {
      score += 35
      reasons.push('Tenggat besok')
    } else if (d <= 3) {
      score += 25
      reasons.push(`Tenggat ${d} hari lagi`)
    } else if (d <= 7) score += 12
  }

  const total = task.subtasks.length
  const done = task.subtasks.filter((s) => s.done).length
  if (total && done > 0 && done < total) {
    score += 8
    reasons.push(`Tinggal ${total - done} subtugas`)
  }

  const ageDays = Math.max(0, (now - task.createdAt) / 86_400_000)
  if (ageDays >= 7) reasons.push(`Tertunda ${Math.floor(ageDays)} hari`)
  score += Math.min(10, ageDays * 0.5)

  if (task.estimateMin && task.estimateMin <= 30) {
    score += 5
    reasons.push('Cepat selesai')
  }
  return { task, score: Math.round(score * 10) / 10, reasons }
}

export function rankTasks(tasks: Task[], today: DateKey, now = Date.now()): Scored[] {
  return tasks
    .filter((t) => !t.done)
    .map((t) => scoreTask(t, today, now))
    .sort((a, b) => b.score - a.score || a.task.createdAt - b.task.createdAt)
}

export const topThree = (tasks: Task[], today: DateKey, now = Date.now()) => rankTasks(tasks, today, now).slice(0, 3)

export function dueLabel(due: DateKey, today: DateKey) {
  const d = daysUntil(due, today)
  if (d === 0) return 'Hari ini'
  if (d === 1) return 'Besok'
  if (d === 2) return 'Lusa'
  if (d === -1) return 'Kemarin'
  if (d < 0) return `Telat ${-d} hari`
  if (d < 7) return fmt(due, 'EEEE')
  return fmt(due, 'd MMM')
}

export type Bucket = 'overdue' | 'today' | 'week' | 'later' | 'none'
export const BUCKET_LABEL: Record<Bucket, string> = {
  overdue: 'Terlambat',
  today: 'Hari ini',
  week: '7 hari ke depan',
  later: 'Nanti',
  none: 'Tanpa tenggat',
}
export function bucketOf(task: Task, today: DateKey): Bucket {
  if (!task.due) return 'none'
  const d = daysUntil(task.due, today)
  if (d < 0) return 'overdue'
  if (d === 0) return 'today'
  if (d <= 7) return 'week'
  return 'later'
}
