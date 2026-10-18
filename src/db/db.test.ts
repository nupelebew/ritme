import { describe, expect, it } from 'vitest'
import Dexie from 'dexie'
import { RitmeDB, DEFAULT_CATEGORIES } from './db'
import { hhmmToMin, minToHHMM, shiftKey } from '@/lib/date'

describe('database', () => {
  it('mengisi kategori bawaan saat pertama dibuat', async () => {
    const db = new RitmeDB('test-seed')
    const cats = await db.categories.orderBy('order').toArray()
    expect(cats.map((c) => c.name)).toEqual(DEFAULT_CATEGORIES.map((c) => c.name))
    db.close()
  })

  it('menyimpan dan membaca pengaturan', async () => {
    const db = new RitmeDB('test-settings')
    await db.settings.put({ key: 'theme', value: 'light' })
    expect((await db.settings.get('theme'))?.value).toBe('light')
    db.close()
  })
})

describe('migrasi v1 → v2', () => {
  it('data lama tetap utuh dan tabel baru tersedia', async () => {
    const old = new Dexie('test-upgrade')
    old.version(1).stores({
      categories: 'id, order',
      events: 'id, date, seriesId, categoryId',
      tasks: 'id, done, due, categoryId, doneAt',
      habits: 'id, order',
      habitLogs: 'id, habitId, date',
      sessions: 'id, date, categoryId, taskId, start',
      days: 'date',
      settings: 'key',
    })
    await old.table('tasks').add({ id: 'lama', title: 'Tugas lama', categoryId: 'skripsi', priority: 2, subtasks: [], done: false, createdAt: 1 })
    await old.table('days').put({ date: '2026-10-01', mood: 4 })
    old.close()

    const db = new RitmeDB('test-upgrade')
    expect((await db.tasks.get('lama'))?.title).toBe('Tugas lama')
    expect((await db.days.get('2026-10-01'))?.mood).toBe(4)
    await db.milestones.add({ id: 'm', title: 'Bab 1', done: false, order: 0 })
    await db.tasks.update('lama', { milestoneId: 'm' })
    expect(await db.tasks.where('milestoneId').equals('m').count()).toBe(1)
    db.close()
  })
})

describe('tempat sampah', () => {
  it('hapus → masuk sampah → pulihkan; yang > 30 hari dibuang', async () => {
    const db = new RitmeDB('test-trash')
    const { toTrash, restoreTrash, purgeTrash } = await import('./trash')
    const task = { id: 't', title: 'Revisi', categoryId: 'skripsi', priority: 2 as const, subtasks: [], done: false, createdAt: 1 }
    await toTrash(db, 'task', task.title, task)
    const item = (await db.trash.toArray())[0]
    await restoreTrash(db, item)
    expect((await db.tasks.get('t'))?.title).toBe('Revisi')
    expect(await db.trash.count()).toBe(0)

    await db.trash.add({ id: 'lama', kind: 'task', label: 'x', data: task, deletedAt: Date.now() - 31 * 86_400_000 })
    await db.trash.add({ id: 'baru', kind: 'task', label: 'y', data: task, deletedAt: Date.now() - 2 * 86_400_000 })
    await purgeTrash(db)
    expect((await db.trash.toArray()).map((t) => t.id)).toEqual(['baru'])
    db.close()
  })
})

describe('util waktu', () => {
  it('konversi menit <-> HH:MM', () => {
    expect(minToHHMM(615)).toBe('10:15')
    expect(hhmmToMin('07:30')).toBe(450)
    expect(hhmmToMin('7.05')).toBe(425)
    expect(hhmmToMin('25:00')).toBeNaN()
  })
  it('geser tanggal melewati batas bulan', () => {
    expect(shiftKey('2026-10-31', 1)).toBe('2026-11-01')
  })
})
