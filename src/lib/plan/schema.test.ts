import { describe, expect, it } from 'vitest'
import { DEFAULT_CATEGORIES } from '@/db/db'
import type { Task } from '@/db/types'
import { extractJson, validatePlan } from './schema'

const tasks: Task[] = [{ id: 't1', title: 'Bab 3', categoryId: 'skripsi', priority: 3, subtasks: [], done: false, createdAt: 0 }]
const ctx = { categories: DEFAULT_CATEGORIES, tasks, expectedDate: '2026-10-19' }

const reply = `Siap! Ini rencananya:
\`\`\`json
{
  "date": "2026-10-19",
  "blocks": [
    {"title": "Nulis bab 3", "start": "08:00", "end": "10:00", "category": "Skripsi", "taskId": "t1"},
    {"title": "Revisi logo klien", "start": "13:00", "end": "15:00", "category": "freelance"},
    {"title": "Makan malam", "start": "19:00", "end": "20:00", "category": "Pasangan"}
  ],
  "newTasks": [{"title": "Beli galon", "category": "Rumah", "priority": 2}],
  "top3": ["t1"],
  "notes": "Jangan lupa minum air."
}
\`\`\`
Semoga membantu!`

describe('validasi rencana dari Claude', () => {
  it('menerima balasan lengkap dengan code fence dan teks pembuka', () => {
    const r = validatePlan(reply, ctx)
    expect(r.errors).toEqual([])
    expect(r.plan!.blocks.map((b) => [b.start, b.categoryId, b.taskId])).toEqual([
      [480, 'skripsi', 't1'],
      [780, 'freelance', undefined],
      [1140, 'pasangan', undefined],
    ])
    expect(r.plan!.newTasks[0]).toMatchObject({ title: 'Beli galon', categoryId: 'rumah', priority: 2 })
  })

  it('JSON rusak & jam salah memberi pesan jelas', () => {
    expect(validatePlan('maaf saya tidak bisa', ctx).errors[0]).toMatch(/Tidak menemukan JSON/)
    expect(validatePlan('{"date": "2026-10-19", "blocks": [}', ctx).errors[0]).toMatch(/JSON tidak valid/)
    const r = validatePlan({ date: '2026-10-19', blocks: [{ title: 'X', start: '10:00', end: '09:00', category: 'Skripsi' }] }, ctx)
    expect(r.errors[0]).toMatch(/jam selesai harus setelah/)
    expect(r.plan).toBeUndefined()
  })

  it('peringatan: kategori asing, taskId asing, tumpukan, tanggal beda, tabrakan jadwal tetap', () => {
    const r = validatePlan(
      {
        date: '2026-10-20',
        blocks: [
          { title: 'A', start: '09:00', end: '10:30', category: 'Olahraga', taskId: 'zzz' },
          { title: 'B', start: '10:00', end: '11:00', category: 'Skripsi' },
        ],
      },
      { ...ctx, fixed: [{ start: 600, end: 660, title: 'Bimbingan' }] },
    )
    expect(r.errors).toEqual([])
    expect(r.plan!.date).toBe('2026-10-19')
    expect(r.warnings.join('\n')).toMatch(/Olahraga/)
    expect(r.warnings.join('\n')).toMatch(/taskId tidak ditemukan/)
    expect(r.warnings.join('\n')).toMatch(/bertumpuk/)
    expect(r.warnings.join('\n')).toMatch(/berbeda/)
    expect(r.warnings.join('\n')).toMatch(/Bimbingan/)
  })

  it('extractJson tanpa fence', () => {
    expect(extractJson('hasil: {"a":1} oke')).toBe('{"a":1}')
  })
})
