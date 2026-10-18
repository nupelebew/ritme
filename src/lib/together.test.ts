import { describe, expect, it } from 'vitest'
import type { Category, ScheduleEvent } from '@/db/types'
import { buildICS } from './ics'
import { daysLabel, nextOccurrence } from './specialDates'
import { decodeBusy, encodeBusy, freeTogether, merge } from './together'

describe('cari waktu bareng', () => {
  const mine = [
    { date: '2026-10-19', busy: [[480, 720], [700, 780], [1140, 1200]] as [number, number][] },
    { date: '2026-10-20', busy: [] },
  ]
  it('kode bolak-balik, ringkas, tanpa judul kegiatan', () => {
    const code = encodeBusy(mine, 'Raka|x')
    expect(code).toBe('RITME1|2026-10-19|Raka x|w-1g,24-28;')
    const back = decodeBusy(code)!
    expect(back.name).toBe('Raka x')
    expect(back.days[0].busy).toEqual([[480, 780], [1140, 1200]])
    expect(back.days[1].busy).toEqual([])
    expect(decodeBusy('halo')).toBeNull()
    expect(decodeBusy('RITME1|2026-10-19|A|zz-1')).toBeNull()
  })
  it('irisan waktu kosong ≥ 1 jam di jam aktif', () => {
    const theirs = [
      { date: '2026-10-19', busy: [[600, 900]] as [number, number][] },
      { date: '2026-10-20', busy: [[420, 1320]] as [number, number][] },
    ]
    expect(freeTogether(mine, theirs)).toEqual([{ date: '2026-10-19', slots: [[420, 480], [900, 1140], [1200, 1320]] }])
    expect(merge([[0, 10], [5, 20], [30, 40]])).toEqual([[0, 20], [30, 40]])
  })
})

describe('tanggal penting', () => {
  it('tahunan: tahun ini atau tahun depan, hitung tahun ke-berapa', () => {
    expect(nextOccurrence({ date: '2024-11-02', yearly: true }, '2026-10-18')).toEqual({ date: '2026-11-02', days: 15, years: 2 })
    expect(nextOccurrence({ date: '2023-03-10', yearly: true }, '2026-10-18')).toMatchObject({ date: '2027-03-10', years: 4 })
    expect(nextOccurrence({ date: '2024-02-29', yearly: true }, '2027-01-01').date).toBe('2027-02-28')
    expect(nextOccurrence({ date: '2026-10-20', yearly: false }, '2026-10-18').days).toBe(2)
    expect(daysLabel(0)).toMatch(/Hari ini/)
  })
})

describe('ekspor kalender (.ics)', () => {
  it('RRULE, EXDATE, pengganti dengan RECURRENCE-ID, escape, dan acara tahunan', () => {
    const cats = new Map<string, Category>([['skripsi', { id: 'skripsi', name: 'Skripsi', color: '', icon: '', order: 0 }]])
    const ev: ScheduleEvent[] = [
      { id: 'm', title: 'Nulis, bab; 3', categoryId: 'skripsi', date: '2026-10-19', start: 480, end: 600, recurrence: { freq: 'weekly', days: [1, 3], until: '2026-12-31' }, exceptions: ['2026-10-21', '2026-10-26'], createdAt: 0 },
      { id: 'o', title: 'Nulis (geser)', categoryId: 'skripsi', date: '2026-10-21', start: 540, end: 660, seriesId: 'm', createdAt: 0 },
      { id: 's', title: 'Begadang', categoryId: 'x', date: '2026-10-19', start: 1380, end: 1440, createdAt: 0 },
    ]
    const ics = buildICS(ev, cats, [{ id: 'a', title: 'Anniversary', emoji: '💑', date: '2024-11-02', yearly: true, createdAt: 0 }])
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20261231T235959')
    expect(ics).toContain('EXDATE:20261026T080000')
    expect(ics).not.toContain('EXDATE:20261021T080000')
    expect(ics).toContain('RECURRENCE-ID:20261021T080000')
    expect(ics.match(/UID:m@ritme/g)).toHaveLength(2)
    expect(ics).toContain('SUMMARY:Nulis\\, bab\\; 3')
    expect(ics).toContain('DTEND:20261020T000000')
    expect(ics).toContain('DTSTART;VALUE=DATE:20241102')
    expect(ics).toContain('RRULE:FREQ=YEARLY')
    expect(ics.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true)
  })
})
