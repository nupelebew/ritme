import { startOfWeek } from 'date-fns'
import type { RitmeDB } from './db'
import { eventsForDate } from './events'
import type { DateKey } from './types'
import { fromKey, shiftKey, toKey } from '@/lib/date'
import { estimateStats, goldenHours, weeklyProgress } from '@/lib/insights'

export const weekStartOf = (d: DateKey) => toKey(startOfWeek(fromKey(d), { weekStartsOn: 1 }))

/** Progres target mingguan untuk minggu yang memuat `today` */
export async function loadWeekProgress(db: RitmeDB, targets: Record<string, number>, today: DateKey, nowMin: number) {
  if (!Object.values(targets).some((t) => t > 0)) return []
  const start = weekStartOf(today)
  const days: DateKey[] = []
  for (let d = start; d <= today; d = shiftKey(d, 1)) days.push(d)
  const [occ, sessions] = await Promise.all([
    Promise.all(days.map((d) => eventsForDate(db, d))),
    db.sessions.where('date').between(start, today, true, true).toArray(),
  ])
  return weeklyProgress(targets, start, today, nowMin, occ.flat(), sessions)
}

/** Jam emas & kebiasaan estimasi dari data 60 hari terakhir */
export async function loadInsights(db: RitmeDB, today: DateKey) {
  const [sessions, tasks] = await Promise.all([db.sessions.where('date').aboveOrEqual(shiftKey(today, -60)).toArray(), db.tasks.filter((t) => t.done && !!t.estimateMin).toArray()])
  return { golden: goldenHours(sessions), estimate: estimateStats(tasks, sessions) }
}
