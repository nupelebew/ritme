import { describe, expect, it } from 'vitest'
import type { FocusSession, Task } from '@/db/types'
import { badgesOf, levelOf, xpOf, type AchievementData } from './achievements'
import { computeWrapped } from './wrapped'

const base: AchievementData = { sessions: [], tasks: [], habitLogs: [], bestHabitStreak: 0, milestones: [], invoices: [], events: [], days: [] }
const at = (d: string, h: number) => new Date(`${d}T${String(h).padStart(2, '0')}:00:00`).getTime()
const sess = (date: string, h: number, durationMin: number, categoryId = 'skripsi'): FocusSession => ({ id: date + h, date, start: at(date, h), end: at(date, h) + durationMin * 60_000, durationMin, categoryId, completed: true })
const task = (id: string, doneDate?: string, extra: Partial<Task> = {}): Task => ({ id, title: id, categoryId: 'skripsi', priority: 2, subtasks: [], done: !!doneDate, doneAt: doneDate ? at(doneDate, 12) : undefined, createdAt: 0, ...extra })

describe('XP & level', () => {
  it('rumus XP dan ambang level', () => {
    const d = { ...base, sessions: [sess('2026-10-01', 9, 50)], tasks: [task('a', '2026-10-01'), task('b')], habitLogs: [{ id: 'x', habitId: 'h', date: '2026-10-01' }] }
    expect(xpOf(d)).toBe(50 + 10 + 5)
    expect(levelOf(0)).toMatchObject({ level: 1, title: 'Baru mulai', into: 0, span: 250 })
    expect(levelOf(249).level).toBe(1)
    expect(levelOf(250)).toMatchObject({ level: 2, title: 'Mulai berirama', into: 0, span: 500 })
    expect(levelOf(1600)).toMatchObject({ level: 4, title: 'Rutin', into: 100 })
    expect(levelOf(11_250)).toMatchObject({ level: 10, title: 'Fokus terlatih' })
    expect(levelOf(60_000).title).toBe('Legenda')
  })
})

describe('lencana', () => {
  it('terbuka sesuai data, sisanya ada progres', () => {
    const d: AchievementData = {
      ...base,
      sessions: [sess('2026-10-01', 6, 25), sess('2026-10-02', 9, 300)],
      tasks: [task('a', '2026-10-03'), task('b', '2026-10-03'), task('c', '2026-10-03'), task('d', '2026-10-04')],
      bestHabitStreak: 9,
      milestones: [
        { id: 'm1', title: '', done: true, order: 0 },
        { id: 'm2', title: '', done: false, order: 1 },
      ],
    }
    const b = Object.fromEntries(badgesOf(d).map((x) => [x.id, x]))
    expect(b.first_focus.unlocked).toBe(true)
    expect(b.early_bird.unlocked).toBe(true)
    expect(b.night_owl.unlocked).toBe(false)
    expect(b.three_day.unlocked).toBe(true)
    expect(b.streak_7.unlocked).toBe(true)
    expect(b.streak_30.progress).toBe(0.3)
    expect(b.focus_10h.progress).toBe(0.54)
    expect(b.thesis_half.unlocked).toBe(true)
    expect(b.thesis_done.unlocked).toBe(false)
  })
})

describe('Ritme Wrapped', () => {
  it('rangkuman bulanan', () => {
    const w = computeWrapped({
      month: '2026-10-18',
      sessions: [sess('2026-10-01', 9, 50), sess('2026-10-01', 10, 50), sess('2026-10-05', 9, 25, 'freelance'), sess('2026-09-30', 9, 500)],
      tasks: [task('Revisi besar', '2026-10-02', { subtasks: [{ id: '1', title: '', done: true }, { id: '2', title: '', done: true }] }), task('kecil', '2026-10-03'), task('ketiga', '2026-10-04'), task('lama', '2026-09-03')],
      days: [{ date: '2026-10-01', mood: 4 }, { date: '2026-10-02', mood: 5 }, { date: '2026-09-02', mood: 1 }],
      events: [{ id: 'e', title: 'Nonton', categoryId: 'pasangan', date: '2026-10-04', start: 1140, end: 1260, createdAt: 0 }],
      coupleCategory: 'pasangan',
      habitChecks: 12,
      newBadges: 2,
    })
    expect(w).toMatchObject({
      from: '2026-10-01',
      to: '2026-10-31',
      focusMin: 125,
      activeDays: 2,
      topCategory: { id: 'skripsi', minutes: 100 },
      bestDay: { date: '2026-10-01', minutes: 100 },
      tasksDone: 3,
      hardestTask: 'Revisi besar',
      coupleMin: 120,
      moodAvg: 4.5,
    })
  })
})
