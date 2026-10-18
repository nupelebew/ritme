import { describe, expect, it } from 'vitest'
import type { FocusSession, Milestone, Task } from '@/db/types'
import { countdown, focusPerMilestone, pace, progress } from './thesis'
import { buildBreakdownPrompt, parseBreakdown } from './plan/breakdown'

const m = (id: string, done = false): Milestone => ({ id, title: id, done, order: 0 })

describe('pelacak skripsi', () => {
  it('progres, hitung mundur, dan laju yang dibutuhkan', () => {
    const ms = [m('a', true), m('b', true), m('c'), m('d')]
    expect(progress(ms)).toEqual({ done: 2, total: 4, pct: 50 })
    expect(countdown('2026-12-27', '2026-10-18')).toEqual({ days: 70, label: '10 minggu lagi' })
    expect(countdown('2026-10-25', '2026-10-18')?.label).toBe('7 hari lagi')
    expect(countdown('2026-10-18', '2026-10-18')?.label).toBe('Hari ini!')
    expect(pace(ms, '2026-11-15', '2026-10-18')).toEqual({ left: 2, perWeek: 0.5 })
    expect(pace(ms, undefined, '2026-10-18')).toBeNull()
  })
  it('jam fokus per milestone lewat tugas tertaut', () => {
    const tasks = [{ id: 't1', milestoneId: 'a' }, { id: 't2', milestoneId: 'b' }, { id: 't3' }] as Task[]
    const s = (taskId: string, durationMin: number) => ({ taskId, durationMin }) as FocusSession
    expect(Object.fromEntries(focusPerMilestone([s('t1', 25), s('t1', 50), s('t2', 25), s('t3', 99)], tasks))).toEqual({ a: 75, b: 25 })
  })
})

describe('AI pecah tugas', () => {
  const task = { id: 'x', title: 'Revisi bab 3', categoryId: 'skripsi', priority: 3, subtasks: [{ id: 's', title: 'Baca catatan dosen', done: true }], done: false, createdAt: 0 } as Task
  it('prompt memuat tugas, yang sudah selesai, dan format JSON', () => {
    const p = buildBreakdownPrompt(task, { category: 'Skripsi' })
    expect(p).toContain('Tugas: Revisi bab 3')
    expect(p).toContain('Sudah selesai: Baca catatan dosen')
    expect(p).toContain('"subtasks"')
    expect(p).not.toMatch(/\n\n\n/)
  })
  it('validasi balasan', () => {
    const ok = parseBreakdown('Oke!\n```json\n{"subtasks":[{"title":"Baca ulang komentar","estimateMin":"15"},{"title":"Perbaiki tabel 3.2"}]}\n```')
    expect(ok.steps).toEqual([{ title: 'Baca ulang komentar', estimateMin: 15 }, { title: 'Perbaiki tabel 3.2', estimateMin: undefined }])
    expect(parseBreakdown('{"subtasks": []}').error).toMatch(/Format/)
    expect(parseBreakdown('tidak ada json').error).toMatch(/Tidak menemukan/)
  })
})
