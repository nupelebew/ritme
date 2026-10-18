import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_CATEGORIES } from '@/db/db'
import { buildReviewPrompt } from './review'

// gatherWeek memakai instance db global; arahkan ke database tes terpisah
vi.mock('@/db/db', async (orig) => {
  const m = await orig<typeof import('@/db/db')>()
  return { ...m, db: new m.RitmeDB('test-review') }
})

describe('rekap mingguan', () => {
  it('mengumpulkan fokus, jadwal, tugas, kebiasaan, mood → prompt', async () => {
    const { db } = await import('@/db/db')
    const { gatherWeek } = await import('@/db/review')
    const mon = '2026-10-12'
    const t = (d: string, h: number) => new Date(`${d}T${String(h).padStart(2, '0')}:00:00`).getTime()
    await db.sessions.bulkAdd([
      { id: 's1', start: t(mon, 9), end: t(mon, 10), durationMin: 50, date: mon, categoryId: 'skripsi', completed: true },
      { id: 's2', start: t('2026-10-14', 14), end: t('2026-10-14', 15), durationMin: 25, date: '2026-10-14', categoryId: 'freelance', completed: true },
      { id: 's3', start: t('2026-10-20', 9), end: t('2026-10-20', 10), durationMin: 99, date: '2026-10-20', categoryId: 'skripsi', completed: true },
    ])
    await db.events.add({ id: 'e1', title: 'Nulis', categoryId: 'skripsi', date: mon, start: 480, end: 600, recurrence: { freq: 'daily' }, createdAt: 0 })
    await db.tasks.bulkAdd([
      { id: 'a', title: 'Kirim bab 2', categoryId: 'skripsi', priority: 3, subtasks: [], done: true, doneAt: t('2026-10-13', 16), createdAt: 0 },
      { id: 'b', title: 'Invoice', categoryId: 'freelance', priority: 3, subtasks: [], done: false, due: '2026-10-15', createdAt: 0 },
    ])
    await db.habits.add({ id: 'h', name: 'Minum air', emoji: '💧', color: '#0ff', order: 0, createdAt: t('2026-10-01', 8) })
    await db.habitLogs.bulkAdd([
      { id: 'h_2026-10-12', habitId: 'h', date: mon },
      { id: 'h_2026-10-13', habitId: 'h', date: '2026-10-13' },
    ])
    await db.days.put({ date: '2026-10-13', mood: 4, note: 'Bimbingan lancar' })

    const w = await gatherWeek(mon, '2026-10-18')
    expect(w.focusByCat).toEqual({ skripsi: 50, freelance: 25 })
    expect(w.plannedByCat.skripsi).toBe(7 * 120)
    expect(w.tasksDone.map((x) => x.title)).toEqual(['Kirim bab 2'])
    expect(w.overdue.map((x) => x.title)).toEqual(['Invoice'])
    expect(w.habits[0]).toMatchObject({ done: 2, due: 7 })
    expect(w.days[1]).toMatchObject({ tasksDone: 1, mood: 4 })

    const p = buildReviewPrompt(w, DEFAULT_CATEGORIES, 'Raka')
    expect(p).toContain('12 Okt–18 Okt 2026')
    expect(p).toContain('Total fokus tercatat: 1 j 15 mnt')
    expect(p).toContain('Skripsi: dijadwalkan 14 jam, fokus 50 mnt')
    expect(p).toContain('catatan: "Bimbingan lancar"')
    expect(p).toContain('💧 Minum air: 2/7 hari')
    expect(p).toContain('3 saran konkret')
  })
})
