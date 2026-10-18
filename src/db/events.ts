import type { RitmeDB } from './db'
import { uid } from './db'
import type { DateKey, ScheduleEvent } from './types'
import type { Occurrence } from '@/lib/schedule'
import { expandForDate } from '@/lib/schedule'

export type Scope = 'one' | 'all'
export type EventPatch = Partial<Pick<ScheduleEvent, 'title' | 'categoryId' | 'start' | 'end' | 'notes' | 'recurrence' | 'date' | 'taskId'>>

export async function eventsForDate(db: RitmeDB, date: DateKey) {
  const [singles, recurring] = await Promise.all([
    db.events.where('date').equals(date).toArray(),
    db.events.filter((e) => !!e.recurrence).toArray(),
  ])
  const map = new Map<string, ScheduleEvent>()
  for (const e of [...singles, ...recurring]) map.set(e.id, e)
  return expandForDate([...map.values()], date)
}

export async function createEvent(db: RitmeDB, data: Omit<ScheduleEvent, 'id' | 'createdAt'>) {
  const ev: ScheduleEvent = { ...data, id: uid(), createdAt: Date.now() }
  await db.events.add(ev)
  return ev
}

/**
 * Ubah satu kejadian. Untuk seri berulang:
 * - scope 'one': tanggal ini dikecualikan dari seri, lalu dibuat kegiatan pengganti.
 * - scope 'all': induk seri diubah (tanggal mulai seri tetap).
 */
export async function updateOccurrence(db: RitmeDB, occ: Occurrence, patch: EventPatch, scope: Scope = 'one') {
  if (!occ.masterId) {
    await db.events.update(occ.id, patch)
    return
  }
  const master = await db.events.get(occ.masterId)
  if (!master) return
  if (scope === 'all') {
    const { date: _ignored, ...rest } = patch
    void _ignored
    await db.events.update(master.id, rest)
    return
  }
  await db.transaction('rw', db.events, async () => {
    await db.events.update(master.id, { exceptions: [...(master.exceptions ?? []), occ.date] })
    const { id: _i, key: _k, masterId: _m, recurrence: _r, exceptions: _e, ...base } = occ
    void _i, void _k, void _m, void _r, void _e
    await db.events.add({
      ...base,
      ...patch,
      recurrence: undefined,
      id: uid(),
      seriesId: master.id,
      createdAt: Date.now(),
    })
  })
}

/** Hapus kejadian. Mengembalikan fungsi untuk membatalkan (undo). */
export async function deleteOccurrence(db: RitmeDB, occ: Occurrence, scope: Scope = 'one'): Promise<() => Promise<void>> {
  if (!occ.masterId) {
    const snapshot = await db.events.get(occ.id)
    await db.events.delete(occ.id)
    return async () => {
      if (snapshot) await db.events.put(snapshot)
    }
  }
  const master = await db.events.get(occ.masterId)
  if (!master) return async () => {}
  if (scope === 'one') {
    await db.events.update(master.id, { exceptions: [...(master.exceptions ?? []), occ.date] })
    return async () => {
      await db.events.update(master.id, { exceptions: master.exceptions ?? [] })
    }
  }
  const overrides = await db.events.where('seriesId').equals(master.id).toArray()
  await db.events.bulkDelete([master.id, ...overrides.map((o) => o.id)])
  return async () => {
    await db.events.bulkPut([master, ...overrides])
  }
}
