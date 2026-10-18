import { db, uid } from './db'
import type { ScheduleEvent, Task } from './types'
import type { NormalizedPlan } from '@/lib/plan/schema'

/**
 * Terapkan rencana ke tanggalnya: buat tugas baru, lalu blok jadwal (ditautkan ke tugas bila judulnya sama).
 * `replace` = hapus dulu kegiatan sekali-jalan (bukan seri berulang) di tanggal itu.
 * Mengembalikan fungsi urungkan.
 */
export async function applyPlan(plan: NormalizedPlan, opts: { replace?: boolean } = {}) {
  const now = Date.now()
  const newTasks: Task[] = plan.newTasks.map((t, i) => ({
    id: uid(),
    title: t.title,
    categoryId: t.categoryId,
    priority: t.priority,
    due: t.due,
    estimateMin: t.estimateMin,
    subtasks: [],
    done: false,
    createdAt: now + i,
  }))
  const byTitle = new Map(newTasks.map((t) => [t.title.toLowerCase(), t.id]))
  const events: ScheduleEvent[] = plan.blocks.map((b, i) => ({
    id: uid(),
    title: b.title,
    categoryId: b.categoryId,
    date: plan.date,
    start: b.start,
    end: b.end,
    notes: b.notes,
    taskId: b.taskId ?? byTitle.get(b.title.toLowerCase()),
    createdAt: now + i,
  }))

  let removed: ScheduleEvent[] = []
  await db.transaction('rw', db.events, db.tasks, async () => {
    if (opts.replace) {
      removed = await db.events.where('date').equals(plan.date).filter((e) => !e.recurrence).toArray()
      await db.events.bulkDelete(removed.map((e) => e.id))
    }
    await db.tasks.bulkAdd(newTasks)
    await db.events.bulkAdd(events)
  })

  return {
    events: events.length,
    tasks: newTasks.length,
    undo: async () => {
      await db.transaction('rw', db.events, db.tasks, async () => {
        await db.events.bulkDelete(events.map((e) => e.id))
        await db.tasks.bulkDelete(newTasks.map((t) => t.id))
        if (removed.length) await db.events.bulkPut(removed)
      })
    },
  }
}
