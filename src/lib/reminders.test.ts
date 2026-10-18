import { describe, expect, it } from 'vitest'
import { dueReminders, showEveningBanner } from './reminders'

const base = {
  today: '2026-10-18',
  events: [
    { key: 'a', title: 'Bimbingan', start: 600 },
    { key: 'b', title: 'Kerja freelance', start: 780 },
  ],
  leadMin: 10,
  eveningHour: 20,
  tomorrowPlanned: true,
  sent: new Set<string>(),
}

describe('pengingat', () => {
  it('kirim pengingat kegiatan di jendela N menit, tanpa mengulang', () => {
    expect(dueReminders({ ...base, nowMin: 585 })).toEqual([])
    const r = dueReminders({ ...base, nowMin: 592 })
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ id: 'ev:2026-10-18:a', title: 'Bimbingan sebentar lagi', body: 'Mulai 10:00 (8 menit lagi).' })
    expect(dueReminders({ ...base, nowMin: 595, sent: new Set([r[0].id]) })).toEqual([])
  })
  it('kegiatan yang sudah lama mulai tidak diingatkan; leadMin 0 = mati', () => {
    expect(dueReminders({ ...base, nowMin: 610 })).toEqual([])
    expect(dueReminders({ ...base, nowMin: 600 })[0].title).toBe('Mulai sekarang: Bimbingan')
    expect(dueReminders({ ...base, leadMin: 0, nowMin: 595 })).toEqual([])
  })
  it('pengingat malam hanya bila besok belum direncanakan', () => {
    expect(dueReminders({ ...base, events: [], nowMin: 20 * 60 + 5 })).toEqual([])
    const r = dueReminders({ ...base, events: [], nowMin: 20 * 60 + 5, tomorrowPlanned: false })
    expect(r.map((x) => x.id)).toEqual(['evening:2026-10-18'])
    expect(dueReminders({ ...base, events: [], nowMin: 19 * 60, tomorrowPlanned: false })).toEqual([])
  })
  it('banner malam', () => {
    expect(showEveningBanner(21 * 60, 20, false, false)).toBe(true)
    expect(showEveningBanner(21 * 60, 20, true, false)).toBe(false)
    expect(showEveningBanner(21 * 60, 20, false, true)).toBe(false)
    expect(showEveningBanner(18 * 60, 20, false, false)).toBe(false)
  })
})
