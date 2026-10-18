import { describe, expect, it } from 'vitest'
import type { FocusSession, Task } from '@/db/types'
import { dayStreaks, focusByCategory, heatmapColumns, levelOf, trend } from './stats'

const TODAY = '2026-10-18' // Minggu
const s = (date: string, min: number, cat = 'skripsi'): FocusSession => ({ id: date + min + cat, start: 0, end: 0, durationMin: min, date, categoryId: cat, completed: true })

describe('statistik', () => {
  it('tren mingguan & bulanan menjumlah fokus dan tugas selesai', () => {
    const sessions = [s('2026-10-12', 50), s('2026-10-18', 25), s('2026-10-11', 30), s('2026-09-30', 60)]
    const tasks: Task[] = [
      { id: 'a', title: 'a', categoryId: 'x', priority: 2, subtasks: [], done: true, doneAt: new Date('2026-10-13T10:00').getTime(), createdAt: 0 },
    ]
    const w = trend('week', 3, TODAY, sessions, tasks)
    expect(w.map((b) => [b.start, b.focusMin, b.tasksDone])).toEqual([
      ['2026-09-28', 60, 0],
      ['2026-10-05', 30, 0],
      ['2026-10-12', 75, 1],
    ])
    const m = trend('month', 2, TODAY, sessions, tasks)
    expect(m.map((b) => [b.label, b.focusMin])).toEqual([
      ['Sep', 60],
      ['Okt', 105],
    ])
  })

  it('heatmap: kolom Senin–Minggu, masa depan kosong', () => {
    const cols = heatmapColumns('2026-10-15', 2) // Kamis
    expect(cols[0][0]).toBe('2026-10-05')
    expect(cols[1][3]).toBe('2026-10-15')
    expect(cols[1][4]).toBeNull()
  })

  it('level intensitas berjenjang', () => {
    expect([0, 10, 30, 59, 60, 119, 120, 300].map(levelOf)).toEqual([0, 1, 2, 2, 3, 3, 4, 4])
  })

  it('streak hari aktif & per kategori', () => {
    const active = new Set(['2026-10-10', '2026-10-11', '2026-10-12', '2026-10-16', '2026-10-17'])
    expect(dayStreaks(active, TODAY)).toEqual({ current: 2, longest: 3 })
    expect(focusByCategory([s('2026-10-01', 30, 'a'), s('2026-10-02', 50, 'b'), s('2026-10-03', 30, 'a')])).toEqual([
      ['a', 60],
      ['b', 50],
    ])
  })
})
