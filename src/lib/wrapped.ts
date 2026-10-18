import { endOfMonth, startOfMonth } from 'date-fns'
import type { DateKey, DayEntry, FocusSession, ScheduleEvent, Task } from '@/db/types'
import { fromKey, toKey } from './date'
import { goldenHours } from './insights'
import type { Occurrence } from './schedule'

export interface WrappedInput {
  month: DateKey // tanggal mana pun di bulan itu
  sessions: FocusSession[]
  tasks: Task[]
  days: DayEntry[]
  /** Kejadian jadwal (sudah diekspansi) di bulan itu */
  events: (ScheduleEvent | Occurrence)[]
  coupleCategory?: string
  habitChecks: number
  newBadges: number
}

export interface Wrapped {
  from: DateKey
  to: DateKey
  focusMin: number
  activeDays: number
  topCategory?: { id: string; minutes: number }
  bestDay?: { date: DateKey; minutes: number }
  golden?: [number, number]
  tasksDone: number
  hardestTask?: string
  coupleMin: number
  moodAvg?: number
  habitChecks: number
  newBadges: number
}

export function computeWrapped(i: WrappedInput): Wrapped {
  const from = toKey(startOfMonth(fromKey(i.month)))
  const to = toKey(endOfMonth(fromKey(i.month)))
  const inMonth = (d: DateKey) => d >= from && d <= to
  const sessions = i.sessions.filter((s) => inMonth(s.date))
  const focusMin = sessions.reduce((a, s) => a + s.durationMin, 0)

  const byDay = new Map<DateKey, number>()
  const byCat = new Map<string, number>()
  for (const s of sessions) {
    byDay.set(s.date, (byDay.get(s.date) ?? 0) + s.durationMin)
    if (s.categoryId) byCat.set(s.categoryId, (byCat.get(s.categoryId) ?? 0) + s.durationMin)
  }
  const top = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0]
  const best = [...byDay.entries()].sort((a, b) => b[1] - a[1])[0]
  const g = goldenHours(sessions)

  const done = i.tasks.filter((t) => t.done && t.doneAt && inMonth(toKey(new Date(t.doneAt))))
  const hardest = [...done].sort((a, b) => b.subtasks.length - a.subtasks.length || (b.estimateMin ?? 0) - (a.estimateMin ?? 0))[0]
  const moods = i.days.filter((d) => inMonth(d.date) && d.mood).map((d) => d.mood!)
  const couple = i.coupleCategory ? i.events.filter((e) => e.categoryId === i.coupleCategory && inMonth(e.date)).reduce((a, e) => a + e.end - e.start, 0) : 0

  return {
    from,
    to,
    focusMin,
    activeDays: byDay.size,
    topCategory: top ? { id: top[0], minutes: top[1] } : undefined,
    bestDay: best ? { date: best[0], minutes: best[1] } : undefined,
    golden: g.confident ? g.window : undefined,
    tasksDone: done.length,
    hardestTask: done.length >= 3 && hardest && (hardest.subtasks.length || hardest.estimateMin) ? hardest.title : undefined,
    coupleMin: couple,
    moodAvg: moods.length ? Math.round((moods.reduce((a, b) => a + b, 0) / moods.length) * 10) / 10 : undefined,
    habitChecks: i.habitChecks,
    newBadges: i.newBadges,
  }
}
