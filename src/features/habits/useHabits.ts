import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db } from '@/db/db'
import type { DateKey, Habit } from '@/db/types'
import { shiftKey, todayKey } from '@/lib/date'
import { logId } from '@/lib/habits'

export function useHabits() {
  const today = todayKey()
  const habits = useLiveQuery(() => db.habits.orderBy('order').filter((h) => !h.archived).toArray(), [])
  // Cukup ambil log ~1 tahun terakhir untuk streak & kalender
  const logs = useLiveQuery(() => db.habitLogs.where('date').aboveOrEqual(shiftKey(today, -400)).toArray(), [today])
  return useMemo(() => {
    const byHabit = new Map<string, Set<DateKey>>()
    for (const l of logs ?? []) {
      if (!byHabit.has(l.habitId)) byHabit.set(l.habitId, new Set())
      byHabit.get(l.habitId)!.add(l.date)
    }
    return {
      ready: !!habits && !!logs,
      habits: habits ?? [],
      done: (id: string) => byHabit.get(id) ?? new Set<DateKey>(),
      today,
    }
  }, [habits, logs, today])
}

export async function toggleHabit(h: Habit, date: DateKey) {
  const id = logId(h.id, date)
  if (await db.habitLogs.get(id)) {
    await db.habitLogs.delete(id)
    return false
  }
  await db.habitLogs.put({ id, habitId: h.id, date })
  navigator.vibrate?.(10)
  return true
}
