import { describe, expect, it } from 'vitest'
import type { Task } from '@/db/types'
import { DEFAULT_CATEGORIES } from '@/db/db'
import { bucketOf, dueLabel, scoreTask, topThree } from './priority'
import { parseQuickAdd } from './quickAdd'

const TODAY = '2026-10-18' // Minggu
const NOW = new Date('2026-10-18T09:00:00').getTime()
const t = (p: Partial<Task>): Task => ({
  id: p.title ?? 'x',
  title: 'x',
  categoryId: 'skripsi',
  priority: 2,
  subtasks: [],
  done: false,
  createdAt: NOW,
  ...p,
})

describe('skor prioritas', () => {
  it('tenggat terlambat & hari ini mengalahkan prioritas tinggi tanpa tenggat', () => {
    const top = topThree(
      [
        t({ title: 'tinggi-tanpa-tenggat', priority: 3 }),
        t({ title: 'sedang-hari-ini', due: TODAY }),
        t({ title: 'rendah-telat', priority: 1, due: '2026-10-15' }),
        t({ title: 'rendah-nanti', priority: 1, due: '2026-11-30' }),
        t({ title: 'selesai', priority: 4, done: true }),
      ],
      TODAY,
      NOW,
    )
    expect(top.map((s) => s.task.title)).toEqual(['rendah-telat', 'sedang-hari-ini', 'tinggi-tanpa-tenggat'])
  })
  it('memberi alasan yang bisa dibaca', () => {
    const s = scoreTask(
      t({ priority: 4, due: '2026-10-19', estimateMin: 20, subtasks: [{ id: 'a', title: 'a', done: true }, { id: 'b', title: 'b', done: false }] }),
      TODAY,
      NOW,
    )
    expect(s.reasons).toEqual(['Prioritas mendesak', 'Tenggat besok', 'Tinggal 1 subtugas', 'Cepat selesai'])
  })
  it('tugas yang lama tertunda naik pelan-pelan', () => {
    const old = scoreTask(t({ createdAt: NOW - 10 * 86_400_000 }), TODAY, NOW)
    const fresh = scoreTask(t({}), TODAY, NOW)
    expect(old.score).toBeGreaterThan(fresh.score)
    expect(old.reasons).toContain('Tertunda 10 hari')
  })
  it('label & kelompok tenggat', () => {
    expect(dueLabel('2026-10-19', TODAY)).toBe('Besok')
    expect(dueLabel('2026-10-15', TODAY)).toBe('Telat 3 hari')
    expect(bucketOf(t({ due: '2026-10-24' }), TODAY)).toBe('week')
    expect(bucketOf(t({}), TODAY)).toBe('none')
  })
})

describe('tambah cepat', () => {
  it('mengurai tanggal, prioritas, kategori, dan estimasi', () => {
    expect(parseQuickAdd('Kirim draft ke dosbing besok !3 #skrip 30m', TODAY, DEFAULT_CATEGORIES)).toEqual({
      title: 'Kirim draft ke dosbing',
      due: '2026-10-19',
      priority: 3,
      categoryId: 'skripsi',
      estimateMin: 30,
    })
  })
  it('nama hari menuju hari itu berikutnya, tanggal d/m', () => {
    expect(parseQuickAdd('Invoice klien jumat', TODAY, DEFAULT_CATEGORIES).due).toBe('2026-10-23')
    expect(parseQuickAdd('Bayar kos 1/11', TODAY, DEFAULT_CATEGORIES).due).toBe('2026-11-01')
    expect(parseQuickAdd('Ulang tahun 5/1', TODAY, DEFAULT_CATEGORIES).due).toBe('2027-01-05')
  })
  it('kategori tak dikenal tetap jadi bagian judul', () => {
    const p = parseQuickAdd('Belajar #figma 1.5j', TODAY, DEFAULT_CATEGORIES)
    expect(p).toMatchObject({ title: 'Belajar #figma', estimateMin: 90 })
    expect(p.categoryId).toBeUndefined()
  })
  it('versi ucapan: "prioritas tinggi", "kategori …", "30 menit"', () => {
    expect(parseQuickAdd('revisi bab dua besok prioritas tinggi kategori skripsi 30 menit', TODAY, DEFAULT_CATEGORIES)).toEqual({
      title: 'revisi bab dua',
      due: '2026-10-19',
      priority: 3,
      categoryId: 'skripsi',
      estimateMin: 30,
    })
    expect(parseQuickAdd('nonton kategori bareng pasangan', TODAY, DEFAULT_CATEGORIES)).toMatchObject({ title: 'nonton', categoryId: 'pasangan' })
    expect(parseQuickAdd('kirim invoice penting banget', TODAY, DEFAULT_CATEGORIES)).toMatchObject({ title: 'kirim invoice', priority: 4 })
    expect(parseQuickAdd('beli kategori buku', TODAY, DEFAULT_CATEGORIES)).toMatchObject({ title: 'beli kategori buku' })
  })

  it('#pasangan cocok dengan "Bareng Pasangan" lewat awal kata', () => {
    expect(parseQuickAdd('Nonton #bareng', TODAY, DEFAULT_CATEGORIES).categoryId).toBe('pasangan')
  })
})
