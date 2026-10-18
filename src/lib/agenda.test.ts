import { describe, expect, it } from 'vitest'
import type { Task } from '@/db/types'
import { RitmeDB } from '@/db/db'
import { loadAgenda } from '@/db/agenda'
import { buildAgenda } from './agenda'
import type { Occurrence } from './schedule'

const ev = (title: string, start: number, end: number): Occurrence => ({
  id: title, key: title, title, start, end, date: '2026-10-18', categoryId: 'skripsi', createdAt: 0,
})
const task = (title: string): Task => ({ id: title, title, categoryId: 'skripsi', priority: 3, subtasks: [], done: false, createdAt: 0 })

describe('agenda notifikasi', () => {
  it('sedang berjalan + berikutnya + tugas + kebiasaan', () => {
    const a = buildAgenda({
      nowMin: 13 * 60 + 30,
      events: [ev('Bimbingan', 600, 660), ev('Kerja freelance', 780, 930), ev('Makan malam', 1140, 1200)],
      topTasks: [task('Kirim draft'), task('Invoice')],
      dueCount: 2,
      habitsLeft: 1,
    })
    expect(a.title).toBe('Sekarang: Kerja freelance (s/d 15:30)')
    expect(a.body.split('\n')).toEqual([
      'Lalu 19:00 Makan malam (dalam 5 j 30 mnt)',
      '2 kegiatan tersisa hari ini',
      'Fokus: 1. Kirim draft · 2. Invoice',
      '🔥 1 kebiasaan belum dicentang',
    ])
    expect(a.topTask?.id).toBe('Kirim draft')
    expect(a.badge).toBe(2)
  })
  it('hari kosong mengajak menyusun jadwal', () => {
    const a = buildAgenda({ nowMin: 480, events: [], topTasks: [], dueCount: 0, habitsLeft: 0 })
    expect(a).toMatchObject({ title: 'Hari ini masih kosong', body: 'Ketuk untuk menyusun jadwal hari ini.', badge: 0 })
  })
  it('loadAgenda membaca database', async () => {
    const db = new RitmeDB('test-agenda')
    await db.events.add({ id: 'e', title: 'Nulis', categoryId: 'skripsi', date: '2026-10-01', start: 600, end: 700, recurrence: { freq: 'daily' }, createdAt: 0 })
    await db.tasks.bulkAdd([
      { ...task('Lewat'), due: '2026-10-17' },
      { ...task('Selesai'), done: true, due: '2026-10-17' },
      task('Tanpa tenggat'),
    ])
    const a = await loadAgenda(db, new Date('2026-10-18T09:00:00'))
    expect(a.title).toBe('Berikutnya 10:00: Nulis')
    expect(a.badge).toBe(1)
    expect(a.topTask?.title).toBe('Lewat')
    db.close()
  })
})
