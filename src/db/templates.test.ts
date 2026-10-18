import { describe, expect, it } from 'vitest'
import { RitmeDB } from './db'
import { applyTemplate, saveTemplateFromDay } from './templates'
import { loadWeekProgress } from './insights'

describe('template hari', () => {
  it('simpan dari hari → terapkan ke hari lain, lewati yang bentrok, bisa diurungkan', async () => {
    const db = new RitmeDB('test-template')
    await db.events.bulkAdd([
      { id: 'a', title: 'Kampus', categoryId: 'skripsi', date: '2026-10-19', start: 480, end: 720, createdAt: 0 },
      { id: 'b', title: 'Gym', categoryId: 'santai', date: '2026-10-19', start: 1020, end: 1080, createdAt: 0 },
      { id: 'r', title: 'Berulang', categoryId: 'rumah', date: '2026-10-19', start: 1200, end: 1260, recurrence: { freq: 'daily' }, createdAt: 0 },
    ])
    const tpl = await saveTemplateFromDay(db, '2026-10-19', 'Hari kampus', '🎓')
    expect(tpl!.blocks.map((b) => b.title)).toEqual(['Kampus', 'Gym'])

    const r = await applyTemplate(db, tpl!, '2026-10-21', [{ start: 1000, end: 1030 }])
    expect(r).toMatchObject({ created: 1, skipped: 1 })
    expect((await db.events.where('date').equals('2026-10-21').toArray()).map((e) => e.title)).toEqual(['Kampus'])
    await r.undo()
    expect(await db.events.where('date').equals('2026-10-21').count()).toBe(0)
    db.close()
  })

  it('progres target mingguan dari database (termasuk jadwal berulang)', async () => {
    const db = new RitmeDB('test-week')
    await db.events.add({ id: 'p', title: 'Nonton bareng', categoryId: 'pasangan', date: '2026-10-12', start: 1140, end: 1200, recurrence: { freq: 'daily' }, createdAt: 0 })
    const r = await loadWeekProgress(db, { pasangan: 420 }, '2026-10-14', 20 * 60)
    // Sen & Sel penuh (2 × 60) + Rabu 19:00–20:00 sudah lewat (60)
    expect(r[0]).toMatchObject({ categoryId: 'pasangan', done: 180, pct: 43 })
    expect(await loadWeekProgress(db, {}, '2026-10-14', 0)).toEqual([])
    db.close()
  })
})
