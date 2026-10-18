import { describe, expect, it } from 'vitest'
import type { ScheduleEvent } from '@/db/types'
import { expandForDate, layoutColumns, occursOn, recurrenceLabel } from './schedule'
import { RitmeDB } from '@/db/db'
import { createEvent, deleteOccurrence, eventsForDate, updateOccurrence } from '@/db/events'

const base = (p: Partial<ScheduleEvent>): ScheduleEvent => ({
  id: 'x',
  title: 'X',
  categoryId: 'skripsi',
  date: '2026-10-19', // Senin
  start: 540,
  end: 600,
  createdAt: 0,
  ...p,
})

describe('kegiatan berulang', () => {
  it('harian mulai tanggal awal, berhenti di until, melewati pengecualian', () => {
    const ev = base({ recurrence: { freq: 'daily', until: '2026-10-25' }, exceptions: ['2026-10-21'] })
    expect(occursOn(ev, '2026-10-18')).toBe(false)
    expect(occursOn(ev, '2026-10-19')).toBe(true)
    expect(occursOn(ev, '2026-10-21')).toBe(false)
    expect(occursOn(ev, '2026-10-25')).toBe(true)
    expect(occursOn(ev, '2026-10-26')).toBe(false)
  })
  it('mingguan hanya di hari yang dipilih', () => {
    const ev = base({ recurrence: { freq: 'weekly', days: [1, 3, 5] } })
    expect(occursOn(ev, '2026-10-21')).toBe(true) // Rabu
    expect(occursOn(ev, '2026-10-22')).toBe(false) // Kamis
  })
  it('expandForDate mengurutkan menurut jam mulai', () => {
    const list = expandForDate(
      [base({ id: 'a', start: 700, end: 760 }), base({ id: 'b', start: 480, end: 500, recurrence: { freq: 'daily' } })],
      '2026-10-19',
    )
    expect(list.map((o) => o.key)).toEqual(['b@2026-10-19', 'a'])
    expect(list[0].masterId).toBe('b')
  })
  it('label pengulangan', () => {
    expect(recurrenceLabel({ freq: 'weekly', days: [5, 1, 2, 3, 4] })).toBe('Hari kerja')
    expect(recurrenceLabel({ freq: 'weekly', days: [2] })).toBe('Setiap Sel')
  })
})

describe('layoutColumns', () => {
  it('blok bertabrakan dibagi kolom, yang terpisah penuh', () => {
    const r = layoutColumns([
      { start: 0, end: 60 },
      { start: 30, end: 90 },
      { start: 60, end: 120 },
      { start: 200, end: 260 },
    ])
    const byStart = Object.fromEntries(r.map((p) => [p.item.start, p]))
    expect(byStart[0]).toMatchObject({ col: 0, cols: 2 })
    expect(byStart[30]).toMatchObject({ col: 1, cols: 2 })
    expect(byStart[60]).toMatchObject({ col: 0, cols: 2 })
    expect(byStart[200]).toMatchObject({ col: 0, cols: 1 })
  })
})

describe('operasi kegiatan di database', () => {
  it('ubah satu kejadian seri membuat pengganti; hapus seri bisa di-undo', async () => {
    const db = new RitmeDB('test-events')
    const master = await createEvent(db, {
      title: 'Nulis bab 3',
      categoryId: 'skripsi',
      date: '2026-10-19',
      start: 480,
      end: 600,
      recurrence: { freq: 'daily' },
    })
    let occ = (await eventsForDate(db, '2026-10-20'))[0]
    await updateOccurrence(db, occ, { start: 540, end: 660 }, 'one')
    const day = await eventsForDate(db, '2026-10-20')
    expect(day).toHaveLength(1)
    expect(day[0]).toMatchObject({ start: 540, seriesId: master.id })
    expect((await eventsForDate(db, '2026-10-21'))[0].start).toBe(480)

    occ = (await eventsForDate(db, '2026-10-21'))[0]
    await updateOccurrence(db, occ, { title: 'Nulis bab 4' }, 'all')
    expect((await eventsForDate(db, '2026-10-22'))[0].title).toBe('Nulis bab 4')

    const undo = await deleteOccurrence(db, occ, 'all')
    expect(await db.events.count()).toBe(0)
    await undo()
    expect(await db.events.count()).toBe(2)
    db.close()
  })
})
