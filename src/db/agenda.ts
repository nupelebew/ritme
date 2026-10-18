import type { RitmeDB } from './db'
import { eventsForDate } from './events'
import { buildAgenda } from '@/lib/agenda'
import { nowMinutes, toKey } from '@/lib/date'
import { isDue } from '@/lib/habits'
import { rankTasks } from '@/lib/priority'

/** Kumpulkan data hari ini → agenda. Dipakai aplikasi DAN service worker (tanpa DOM). */
export async function loadAgenda(db: RitmeDB, now = new Date()) {
  const today = toKey(now)
  const [events, tasks, habits, logs] = await Promise.all([
    eventsForDate(db, today),
    db.tasks.filter((t) => !t.done).toArray(),
    db.habits.filter((h) => !h.archived).toArray(),
    db.habitLogs.where('date').equals(today).toArray(),
  ])
  const done = new Set(logs.map((l) => l.habitId))
  return buildAgenda({
    nowMin: nowMinutes(now),
    events,
    topTasks: rankTasks(tasks, today, now.getTime())
      .slice(0, 3)
      .map((s) => s.task),
    dueCount: tasks.filter((t) => t.due && t.due <= today).length,
    habitsLeft: habits.filter((h) => isDue(h, today) && !done.has(h.id)).length,
  })
}
