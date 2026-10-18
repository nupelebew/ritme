import type { RitmeDB } from './db'
import { uid } from './db'
import type { Habit, ScheduleEvent, Task, TrashItem } from './types'

export const TRASH_DAYS = 30

export async function toTrash(db: RitmeDB, kind: TrashItem['kind'], label: string, data: unknown) {
  const item: TrashItem = { id: uid(), kind, label, data, deletedAt: Date.now() }
  await db.trash.add(item)
  return item.id
}

/** Kembalikan item dari sampah ke tempat asalnya */
export async function restoreTrash(db: RitmeDB, item: TrashItem) {
  await db.transaction('rw', [db.trash, db.tasks, db.events, db.habits], async () => {
    if (item.kind === 'task') await db.tasks.put(item.data as Task)
    else if (item.kind === 'event') await db.events.put(item.data as ScheduleEvent)
    else if (item.kind === 'series') await db.events.bulkPut(item.data as ScheduleEvent[])
    else if (item.kind === 'habit') await db.habits.put({ ...(item.data as Habit), archived: false })
    await db.trash.delete(item.id)
  })
}

/** Hapus permanen item yang sudah lebih dari 30 hari di sampah */
export async function purgeTrash(db: RitmeDB, now = Date.now()) {
  return db.trash.where('deletedAt').below(now - TRASH_DAYS * 86_400_000).delete()
}
