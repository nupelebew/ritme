import { describe, expect, it } from 'vitest'
import type { Habit } from '@/db/types'
import { completionRate, currentStreak, isDue, longestStreak } from './habits'

const TODAY = '2026-10-18' // Minggu
const h = (p: Partial<Habit> = {}): Habit => ({
  id: 'h',
  name: 'Baca',
  emoji: '📚',
  color: '#8b5cf6',
  order: 0,
  createdAt: new Date('2026-10-01T08:00:00').getTime(),
  ...p,
})
const set = (...d: string[]) => new Set(d)

describe('streak kebiasaan', () => {
  it('hari ini belum dicentang tidak memutus streak', () => {
    expect(currentStreak(h(), set('2026-10-15', '2026-10-16', '2026-10-17'), TODAY)).toBe(3)
    expect(currentStreak(h(), set('2026-10-16', '2026-10-17', TODAY), TODAY)).toBe(3)
  })
  it('bolong satu hari memutus streak', () => {
    expect(currentStreak(h(), set('2026-10-14', '2026-10-15', '2026-10-17'), TODAY)).toBe(1)
  })
  it('hari tak terjadwal dilewati (kebiasaan hari kerja)', () => {
    const weekday = h({ days: [1, 2, 3, 4, 5] })
    // Kamis, Jumat tercentang; Sabtu & Minggu bukan jadwal
    expect(currentStreak(weekday, set('2026-10-15', '2026-10-16'), TODAY)).toBe(2)
    expect(isDue(weekday, TODAY)).toBe(false)
  })
  it('tidak menghitung hari sebelum kebiasaan dibuat', () => {
    expect(isDue(h(), '2026-09-30')).toBe(false)
    expect(currentStreak(h(), set('2026-10-01', '2026-10-02'), '2026-10-02')).toBe(2)
  })
  it('streak terpanjang dan persentase 30 hari', () => {
    const done = set('2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-10', '2026-10-11')
    expect(longestStreak(h(), done, TODAY)).toBe(4)
    // 17 hari terjadwal (1–17 Okt, hari ini dikecualikan karena belum dicentang), 6 tercentang
    expect(completionRate(h(), done, TODAY)).toBe(Math.round((6 / 17) * 100))
  })
})
