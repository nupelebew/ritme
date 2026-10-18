import { describe, expect, it } from 'vitest'
import { DEFAULT_CATEGORIES } from '@/db/db'
import type { Task } from '@/db/types'
import { rankTasks } from '@/lib/priority'
import { autoPlan } from './autoPlan'
import { buildPlanPrompt } from './prompt'
import { validatePlan } from './schema'

const TODAY = '2026-10-18'
const DATE = '2026-10-19'
const mk = (p: Partial<Task>): Task => ({ id: p.title!, title: 'x', categoryId: 'skripsi', priority: 2, subtasks: [], done: false, createdAt: 0, ...p })
const tasks = [
  mk({ title: 'Bab 3', priority: 4, due: DATE, estimateMin: 120 }),
  mk({ title: 'Revisi logo', categoryId: 'freelance', priority: 3, estimateMin: 90 }),
  mk({ title: 'Cuci baju', categoryId: 'rumah', estimateMin: 30 }),
]
const fixed = [{ start: 13 * 60, end: 15 * 60 + 30, title: 'Kerja freelance', categoryId: 'freelance' }]

describe('penyusun otomatis', () => {
  const plan = autoPlan({
    date: DATE,
    today: TODAY,
    fixed,
    ranked: rankTasks(tasks, TODAY),
    tasks,
    brainDump: '- beli galon #rumah 15m\n- Cuci baju\n\n',
    categories: DEFAULT_CATEGORIES,
    dayStartHour: 6,
    dayEndHour: 24,
  })

  it('tidak bertumpuk dengan jadwal tetap maupun antarblok', () => {
    const all = [...plan.blocks, ...fixed].sort((a, b) => a.start - b.start)
    for (let k = 1; k < all.length; k++) expect(all[k].start).toBeGreaterThanOrEqual(all[k - 1].end)
  })
  it('menjadwalkan tugas teratas lebih dulu, dengan makan siang & waktu berdua', () => {
    const titles = plan.blocks.map((b) => b.title)
    expect(titles[0]).toBe('Bab 3')
    expect(plan.blocks[0]).toMatchObject({ start: 7 * 60, end: 9 * 60, taskId: 'Bab 3' })
    expect(titles).toContain('Makan siang & rehat')
    expect(titles).toContain('Waktu bareng pasangan')
    expect(plan.top3[0]).toBe('Bab 3')
  })
  it('ada jeda setelah blok kerja', () => {
    const b3 = plan.blocks.find((b) => b.title === 'Bab 3')!
    const next = plan.blocks.find((b) => b.start >= b3.end)!
    expect(next.start - b3.end).toBeGreaterThanOrEqual(15)
  })
  it('brain dump yang belum jadi tugas masuk newTasks; yang sudah ada diabaikan', () => {
    expect(plan.newTasks).toEqual([{ title: 'beli galon', categoryId: 'rumah', priority: 2, due: DATE, estimateMin: 15 }])
  })
  it('hasilnya lolos validator yang sama dengan jawaban Claude', () => {
    const json = {
      date: plan.date,
      blocks: plan.blocks.map((b) => ({
        ...b,
        start: `${String(Math.floor(b.start / 60)).padStart(2, '0')}:${String(b.start % 60).padStart(2, '0')}`,
        end: `${String(Math.floor(b.end / 60)).padStart(2, '0')}:${String(b.end % 60).padStart(2, '0')}`,
        category: b.categoryId,
      })),
    }
    const r = validatePlan(json, { categories: DEFAULT_CATEGORIES, tasks, expectedDate: DATE, fixed })
    expect(r.errors).toEqual([])
    expect(r.warnings).toEqual([])
  })
})

describe('prompt AI', () => {
  it('memuat konteks, jadwal tetap, tugas dengan id, brain dump, dan format JSON', () => {
    const p = buildPlanPrompt({
      date: DATE,
      today: TODAY,
      name: 'Raka',
      categories: DEFAULT_CATEGORIES,
      fixed: [{ ...fixed[0], id: 'f', key: 'f', date: DATE, createdAt: 0, title: 'Kerja freelance', categoryId: 'freelance' }],
      routines: 'Bangun 06:00, olahraga Selasa & Kamis.',
      ranked: rankTasks(tasks, TODAY),
      habits: [],
      brainDump: 'beli galon',
      dayStartHour: 6,
      dayEndHour: 24,
      focusMin: 25,
    })
    expect(p).toContain('jadwal untuk besok, Senin, 19 Oktober 2026')
    expect(p).toContain('Jam aktif 06:00–24:00')
    expect(p).toContain('13:00–15:30 Kerja freelance [Freelance]')
    expect(p).toContain('[id: Bab 3] Bab 3 | Skripsi | prioritas mendesak')
    expect(p).toContain('Bangun 06:00')
    expect(p).toContain('beli galon')
    expect(p).toContain('"date" wajib "2026-10-19"')
    expect(p).toContain('```json')
  })
})
