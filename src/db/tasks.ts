import { db, uid } from './db'
import { createEvent } from './events'
import type { Task } from './types'
import { nowMinutes, todayKey } from '@/lib/date'
import { eventsForDate } from './events'

export async function addTask(data: Omit<Task, 'id' | 'createdAt' | 'done' | 'subtasks'> & Partial<Pick<Task, 'subtasks'>>) {
  const task: Task = { subtasks: [], ...data, id: uid(), done: false, createdAt: Date.now() }
  await db.tasks.add(task)
  return task
}

/** Tandai selesai / belum. Mengembalikan fungsi urungkan. */
export async function setTaskDone(task: Task, done: boolean) {
  const before = { done: task.done, doneAt: task.doneAt }
  await db.tasks.update(task.id, { done, doneAt: done ? Date.now() : undefined })
  return async () => {
    await db.tasks.update(task.id, before)
  }
}

export async function deleteTask(task: Task) {
  await db.tasks.delete(task.id)
  return async () => {
    await db.tasks.put(task)
  }
}

/**
 * Masukkan tugas ke timeline hari ini di slot kosong pertama setelah sekarang
 * (dibulatkan ke 15 menit), dengan durasi = estimasi atau 60 menit.
 */
export async function scheduleTaskToday(task: Task, dayEndHour = 24) {
  const date = todayKey()
  const len = task.estimateMin ?? 60
  const busy = await eventsForDate(db, date)
  let start = Math.ceil((nowMinutes() + 5) / 15) * 15
  for (const e of busy) {
    if (e.end <= start) continue
    if (e.start >= start + len) break
    start = Math.ceil(e.end / 15) * 15
  }
  if (start + len > dayEndHour * 60) return null
  return createEvent(db, { title: task.title, categoryId: task.categoryId, date, start, end: start + len, taskId: task.id })
}
