import { describe, expect, it } from 'vitest'
import { dueReminders, plannedReminders, showEveningBanner } from './reminders'

const base = {
  today: '2026-10-18',
  events: [
    { key: 'a', title: 'Sarapan', start: 420, end: 450 },
    { key: 'b', title: 'Nulis bab 3', start: 450, end: 570 },
    { key: 'c', title: 'Makan malam', start: 1140, end: 1200 },
  ],
  leadMin: 10,
  atStart: true,
  eveningHour: 20,
  tomorrowPlanned: true,
  sent: new Set<string>(),
}

describe('pengingat', () => {
  it('"sebentar lagi" di jendela N menit sebelum mulai, tanpa mengulang', () => {
    expect(dueReminders({ ...base, nowMin: 405 })).toEqual([])
    const r = dueReminders({ ...base, nowMin: 412 })
    expect(r).toEqual([{ id: 'pre:2026-10-18:a', kind: 'pre', title: 'Sarapan sebentar lagi', body: 'Mulai 07:00 (8 menit lagi).' }])
    expect(dueReminders({ ...base, nowMin: 415, sent: new Set([r[0].id]) })).toEqual([])
  })

  it('pergantian blok: notifikasi tepat saat mulai, menyebut kegiatan berikutnya', () => {
    const r = dueReminders({ ...base, nowMin: 450 })
    expect(r).toEqual([
      { id: 'start:2026-10-18:b', kind: 'start', title: 'Sekarang: Nulis bab 3', body: '07:30–09:30 · berikutnya 19:00 Makan malam' },
    ])
    // telat sedikit (timer di latar tertunda) masih dikirim; telat jauh tidak
    expect(dueReminders({ ...base, nowMin: 452 }).map((x) => x.kind)).toEqual(['start'])
    expect(dueReminders({ ...base, nowMin: 455 })).toEqual([])
    expect(dueReminders({ ...base, nowMin: 1140 })[0].body).toBe('19:00–20:00 · ini kegiatan terakhir hari ini')
  })

  it('pengingat awal & saat mulai bisa dimatikan masing-masing', () => {
    expect(dueReminders({ ...base, leadMin: 0, nowMin: 412 })).toEqual([])
    expect(dueReminders({ ...base, atStart: false, nowMin: 450 })).toEqual([])
    // sebelum: jalan, saat mulai: mati
    expect(dueReminders({ ...base, atStart: false, nowMin: 445 }).map((x) => x.id)).toEqual(['pre:2026-10-18:b'])
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

describe('pengingat terjadwal (aplikasi Android)', () => {
  const { sent: _s, ...input } = base

  it('menghitung jam muncul tiap pengingat, urut waktu', () => {
    const r = plannedReminders(input)
    expect(r.map((x) => [x.id, x.atMin])).toEqual([
      ['pre:2026-10-18:a', 410],
      ['start:2026-10-18:a', 420],
      ['pre:2026-10-18:b', 440],
      ['start:2026-10-18:b', 450],
      ['pre:2026-10-18:c', 1130],
      ['start:2026-10-18:c', 1140],
    ])
    expect(r[0].body).toBe('Mulai 07:00 (10 menit lagi).')
    expect(r[3].body).toBe('07:30–09:30 · berikutnya 19:00 Makan malam')
  })

  it('pengingat malam hanya bila besok belum direncanakan; opsi mati dihormati', () => {
    expect(plannedReminders({ ...input, tomorrowPlanned: false }).at(-1)).toMatchObject({ id: 'evening:2026-10-18', atMin: 1200 })
    expect(plannedReminders({ ...input, leadMin: 0, atStart: false })).toEqual([])
  })
})
