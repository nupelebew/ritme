import { describe, expect, it } from 'vitest'
import type { Task } from '@/db/types'
import { adjustEstimate, estimateStats, goldenHours, minutesByHour, weeklyProgress } from './insights'

const at = (h: number, m = 0) => new Date(2026, 9, 12, h, m).getTime()

describe('jam emas', () => {
  it('menit dibagi ke jam yang dilalui', () => {
    const by = minutesByHour([{ start: at(8, 40), durationMin: 50 }])
    expect(by[8]).toBe(20)
    expect(by[9]).toBe(30)
  })
  it('jendela 3 jam paling produktif', () => {
    const sessions = [
      ...Array.from({ length: 6 }, () => ({ start: at(9), durationMin: 50 })),
      { start: at(20), durationMin: 25 },
      { start: at(14), durationMin: 25 },
    ]
    const g = goldenHours(sessions)
    expect(g.window).toEqual([8, 11])
    expect(g.confident).toBe(true)
    expect(goldenHours(sessions.slice(0, 3)).confident).toBe(false)
  })
})

describe('estimasi vs kenyataan', () => {
  const t = (id: string, est: number): Task => ({ id, title: id, categoryId: 'x', priority: 2, subtasks: [], done: true, estimateMin: est, createdAt: 0 })
  it('median rasio & penyesuaian', () => {
    const tasks = [t('a', 30), t('b', 60), t('c', 20), t('d', 40)]
    const s = (taskId: string, durationMin: number) => ({ taskId, durationMin })
    const st = estimateStats(tasks, [s('a', 45), s('b', 75), s('c', 30), s('d', 40)])
    expect(st).toEqual({ ratio: 1.38, samples: 4 })
    expect(adjustEstimate(30, st)).toBe(40)
    expect(adjustEstimate(30, { ratio: 1.05, samples: 10 })).toBe(30)
    expect(adjustEstimate(30, { ratio: 2, samples: 2 })).toBe(30)
    expect(estimateStats([t('x', 30)], [])).toBeNull()
  })
})

describe('target mingguan', () => {
  it('fokus vs jadwal yang sudah lewat, dan tanda tertinggal', () => {
    const r = weeklyProgress(
      { skripsi: 600, pasangan: 300, santai: 0 },
      '2026-10-12',
      '2026-10-15', // Kamis
      12 * 60,
      [
        { date: '2026-10-13', start: 1140, end: 1260, categoryId: 'pasangan' },
        { date: '2026-10-15', start: 600, end: 840, categoryId: 'skripsi' }, // 10:00–14:00, sekarang 12:00
      ],
      [
        { date: '2026-10-12', durationMin: 50, categoryId: 'skripsi' },
        { date: '2026-10-14', durationMin: 25, categoryId: 'skripsi' },
      ],
    )
    expect(r.map((x) => [x.categoryId, x.done, x.pct, x.behind])).toEqual([
      ['skripsi', 120, 20, true],
      ['pasangan', 120, 40, false],
    ])
  })
})
