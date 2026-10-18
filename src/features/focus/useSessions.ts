import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import type { DateKey, FocusSession } from '@/db/types'

export function useSessionsOn(date: DateKey): FocusSession[] | undefined {
  return useLiveQuery(() => db.sessions.where('date').equals(date).sortBy('start'), [date])
}

export const totalMin = (s: FocusSession[]) => s.reduce((a, x) => a + x.durationMin, 0)
