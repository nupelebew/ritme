import { describe, expect, it } from 'vitest'
import { RitmeDB } from './db'
import { exportBackup, exportCSV, importBackup, importCSV, parseBackup } from './backup'
import { parseCSV, toCSV } from '@/lib/csv'

describe('CSV', () => {
  it('escape & parse bolak-balik (koma, kutip, baris baru)', () => {
    const rows = [{ a: 'halo, dunia', b: 'kata "kutip"', c: 'baris1\nbaris2', d: 5 }]
    const back = parseCSV(toCSV(rows, ['a', 'b', 'c', 'd']))
    expect(back).toEqual([{ a: 'halo, dunia', b: 'kata "kutip"', c: 'baris1\nbaris2', d: '5' }])
  })
})

describe('cadangan', () => {
  it('ekspor → ganti semua → urungkan', async () => {
    const db = new RitmeDB('test-backup-1')
    await db.tasks.add({ id: 't1', title: 'Lama', categoryId: 'skripsi', priority: 2, subtasks: [], done: false, createdAt: 1 })
    const json = JSON.stringify(await exportBackup(db))

    const other = new RitmeDB('test-backup-2')
    await other.tasks.add({ id: 'x', title: 'Akan hilang', categoryId: 'rumah', priority: 1, subtasks: [], done: false, createdAt: 1 })
    const { backup } = parseBackup(json)
    const undo = await importBackup(other, backup!, 'replace')
    expect((await other.tasks.toArray()).map((t) => t.title)).toEqual(['Lama'])
    expect(await other.categories.count()).toBe(5)
    await undo()
    expect((await other.tasks.toArray()).map((t) => t.title)).toEqual(['Akan hilang'])
    db.close()
    other.close()
  })

  it('kunci aplikasi tidak ikut diimpor dan milik perangkat ini dipertahankan', async () => {
    const db = new RitmeDB('test-backup-lock')
    await db.settings.put({ key: 'appLock', value: 'kunci-hp-ini' })
    const b = parseBackup(JSON.stringify({ app: 'ritme', version: 2, data: { settings: [{ key: 'appLock', value: 'kunci-hp-lain' }, { key: 'name', value: 'Raka' }] } })).backup!
    await importBackup(db, b, 'replace')
    expect((await db.settings.get('appLock'))?.value).toBe('kunci-hp-ini')
    expect((await db.settings.get('name'))?.value).toBe('Raka')
    db.close()
  })

  it('gabung mempertahankan data lain & menolak file asing', async () => {
    const db = new RitmeDB('test-backup-3')
    await db.tasks.add({ id: 'a', title: 'A', categoryId: 'skripsi', priority: 2, subtasks: [], done: false, createdAt: 1 })
    const b = parseBackup(JSON.stringify({ app: 'ritme', version: 1, data: { tasks: [{ id: 'b', title: 'B', categoryId: 'rumah', priority: 2, subtasks: [], done: false, createdAt: 2 }] } }))
    await importBackup(db, b.backup!, 'merge')
    expect((await db.tasks.toArray()).map((t) => t.id).sort()).toEqual(['a', 'b'])
    expect(parseBackup('{"foo":1}').error).toMatch(/Bukan file cadangan/)
    expect(parseBackup('bukan json').error).toMatch(/JSON/)
    db.close()
  })

  it('CSV tugas & riwayat: ekspor lalu impor ke database lain', async () => {
    const db = new RitmeDB('test-csv-1')
    await db.tasks.add({ id: 't', title: 'Revisi, "bab 2"', categoryId: 'freelance', priority: 3, due: '2026-10-20', subtasks: [], done: true, doneAt: new Date('2026-10-18T10:00').getTime(), createdAt: 1 })
    await db.days.put({ date: '2026-10-18', mood: 4, note: 'Hari baik\nproduktif' })
    await db.sessions.add({ id: 's', date: '2026-10-18', start: 0, end: 1, durationMin: 25, categoryId: 'skripsi', completed: true })
    const tasksCsv = await exportCSV(db, 'tasks')
    const daysCsv = await exportCSV(db, 'days')
    expect(daysCsv).toContain('2026-10-18,4,"Hari baik\nproduktif",25,1')

    const fresh = new RitmeDB('test-csv-2')
    const r1 = await importCSV(fresh, tasksCsv)
    expect(r1).toMatchObject({ kind: 'tasks', count: 1 })
    expect(await fresh.tasks.get('t')).toMatchObject({ title: 'Revisi, "bab 2"', categoryId: 'freelance', priority: 3, done: true, due: '2026-10-20' })
    const r2 = await importCSV(fresh, daysCsv)
    expect(r2.kind).toBe('days')
    expect(await fresh.days.get('2026-10-18')).toMatchObject({ mood: 4, note: 'Hari baik\nproduktif' })
    await expect(importCSV(fresh, 'foo,bar\n1,2')).rejects.toThrow(/tidak dikenali/)
    db.close()
    fresh.close()
  })
})
