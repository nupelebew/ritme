import { describe, expect, it } from 'vitest'
import type { ScheduleEvent, Task } from '@/db/types'
import { matches, searchAll, snippetOf } from './search'

const task = (title: string, p: Partial<Task> = {}): Task => ({ id: title, title, categoryId: 'skripsi', priority: 2, subtasks: [], done: false, createdAt: 0, ...p })
const ev = (title: string, date: string, p: Partial<ScheduleEvent> = {}): ScheduleEvent => ({ id: title + date, title, categoryId: 'skripsi', date, start: 0, end: 60, createdAt: 0, ...p })

describe('pencarian', () => {
  it('semua kata harus cocok, abaikan huruf besar & aksen', () => {
    expect(matches('Revisi Bab 3 metodologi', 'bab revisi')).toBe(true)
    expect(matches('Café bareng', 'cafe')).toBe(true)
    expect(matches('Revisi bab 3', 'bab 4')).toBe(false)
  })
  it('mencari di tugas (termasuk subtugas), kegiatan tanpa duplikat seri, dan catatan harian', () => {
    const hits = searchAll('sitasi', {
      tasks: [task('Kirim draft', { subtasks: [{ id: 's', title: 'Cek format sitasi', done: false }] }), task('Beli galon')],
      events: [ev('Rapikan sitasi', '2026-10-01', { recurrence: { freq: 'daily' } }), ev('Rapikan sitasi', '2026-10-01', { id: 'dup', recurrence: { freq: 'daily' } })],
      days: [{ date: '2026-10-10', note: 'Dosen minta sitasi APA 7' }],
      habits: [],
      milestones: [],
      guidance: [],
    })
    expect(hits.map((h) => `${h.kind}:${h.title}`)).toEqual(['task:Kirim draft', 'event:Rapikan sitasi', 'day:2026-10-10'])
    expect(hits[0].snippet).toContain('sitasi')
  })
  it('kueri terlalu pendek tidak mencari; potongan teks diberi elipsis', () => {
    expect(searchAll('a', { tasks: [task('abc')], events: [], days: [], habits: [], milestones: [], guidance: [] })).toEqual([])
    expect(snippetOf('x'.repeat(100) + ' kata ' + 'y'.repeat(100), 'kata', 10)).toMatch(/^….*kata.*…$/)
  })
})
