import { db } from './db'
import { eventsForDate } from './events'
import type { DateKey } from './types'
import { shiftKey, fromKey } from '@/lib/date'
import { isDue } from '@/lib/habits'
import type { WeekData, WeekDay } from '@/lib/plan/review'

const add = (r: Record<string, number>, k: string, v: number) => (r[k] = (r[k] ?? 0) + v)

/** Kumpulkan data satu minggu (Senin–Minggu) untuk rekap */
export async function gatherWeek(start: DateKey, today: DateKey): Promise<WeekData> {
  const end = shiftKey(start, 6)
  const dates = Array.from({ length: 7 }, (_, i) => shiftKey(start, i))
  const t0 = fromKey(start).getTime()
  const t1 = fromKey(shiftKey(end, 1)).getTime()

  const [sessions, dayRows, tasks, habits, logs] = await Promise.all([
    db.sessions.where('date').between(start, end, true, true).toArray(),
    db.days.where('date').between(start, end, true, true).toArray(),
    db.tasks.toArray(),
    db.habits.filter((h) => !h.archived).toArray(),
    db.habitLogs.where('date').between(start, end, true, true).toArray(),
  ])
  const occ = await Promise.all(dates.map((d) => eventsForDate(db, d)))

  const focusByCat: Record<string, number> = {}
  const plannedByCat: Record<string, number> = {}
  for (const s of sessions) add(focusByCat, s.categoryId ?? '?', s.durationMin)
  occ.flat().forEach((o) => add(plannedByCat, o.categoryId, o.end - o.start))

  const tasksDone = tasks.filter((t) => t.done && t.doneAt && t.doneAt >= t0 && t.doneAt < t1).sort((a, b) => a.doneAt! - b.doneAt!)
  const lastDay = end < today ? end : today
  const overdue = tasks.filter((t) => !t.done && t.due && t.due < lastDay)

  const days: WeekDay[] = dates.map((date, i) => {
    const row = dayRows.find((r) => r.date === date)
    const dayStart = fromKey(date).getTime()
    return {
      date,
      focusMin: sessions.filter((s) => s.date === date).reduce((a, s) => a + s.durationMin, 0),
      plannedMin: occ[i].reduce((a, o) => a + o.end - o.start, 0),
      tasksDone: tasksDone.filter((t) => t.doneAt! >= dayStart && t.doneAt! < dayStart + 86_400_000).length,
      mood: row?.mood,
      note: [row?.note, row?.reflection?.good && `baik: ${row.reflection.good}`, row?.reflection?.block && `hambatan: ${row.reflection.block}`].filter(Boolean).join(' · ') || undefined,
    }
  })

  const habitStats = habits.map((habit) => {
    const relevant = dates.filter((d) => d <= today && isDue(habit, d))
    return { habit, due: relevant.length, done: logs.filter((l) => l.habitId === habit.id && relevant.includes(l.date)).length }
  })

  return { start, end, days, focusByCat, plannedByCat, tasksDone, overdue, habits: habitStats.filter((h) => h.due > 0) }
}
