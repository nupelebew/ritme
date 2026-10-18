import { describe, expect, it } from 'vitest'
import { RitmeDB, DEFAULT_CATEGORIES } from './db'
import { hhmmToMin, minToHHMM, shiftKey } from '@/lib/date'

describe('database', () => {
  it('mengisi kategori bawaan saat pertama dibuat', async () => {
    const db = new RitmeDB('test-seed')
    const cats = await db.categories.orderBy('order').toArray()
    expect(cats.map((c) => c.name)).toEqual(DEFAULT_CATEGORIES.map((c) => c.name))
    db.close()
  })

  it('menyimpan dan membaca pengaturan', async () => {
    const db = new RitmeDB('test-settings')
    await db.settings.put({ key: 'theme', value: 'light' })
    expect((await db.settings.get('theme'))?.value).toBe('light')
    db.close()
  })
})

describe('util waktu', () => {
  it('konversi menit <-> HH:MM', () => {
    expect(minToHHMM(615)).toBe('10:15')
    expect(hhmmToMin('07:30')).toBe(450)
    expect(hhmmToMin('7.05')).toBe(425)
    expect(hhmmToMin('25:00')).toBeNaN()
  })
  it('geser tanggal melewati batas bulan', () => {
    expect(shiftKey('2026-10-31', 1)).toBe('2026-11-01')
  })
})
