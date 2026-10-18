import type { Category, DateKey, Task } from '@/db/types'
import type { Scored } from '@/lib/priority'
import { parseQuickAdd } from '@/lib/quickAdd'
import { matchCategory, type NormalizedPlan, type PlanBlock, type PlanNewTask } from './schema'

export interface AutoPlanInput {
  date: DateKey
  today: DateKey
  /** Kegiatan yang sudah ada di tanggal itu (tetap) */
  fixed: { start: number; end: number; title?: string; categoryId?: string }[]
  ranked: Scored[]
  tasks: Task[]
  brainDump?: string
  categories: Category[]
  dayStartHour: number
  dayEndHour: number
  /** Menit sekarang bila merencanakan hari ini */
  nowMin?: number
}

const BREAK = 15
const MAX_BLOCK = 120
const MAX_WORK = 6 * 60
const ceil15 = (m: number) => Math.ceil(m / 15) * 15

/** Penyusun jadwal lokal tanpa AI: isi slot kosong dengan tugas teratas + jeda, makan, santai, dan waktu berdua. */
export function autoPlan(i: AutoPlanInput): NormalizedPlan {
  const cats = i.categories.filter((c) => !c.archived)
  const catId = (name: string) => matchCategory(name, cats)?.id
  const busy = i.fixed.map((f) => ({ start: f.start, end: f.end }))
  const blocks: PlanBlock[] = []
  const isFree = (s: number, e: number) => busy.every((b) => e <= b.start || s >= b.end)
  const take = (b: PlanBlock, pad = 0) => {
    blocks.push(b)
    busy.push({ start: b.start, end: b.end + pad })
  }

  let dayStart = (i.dayStartHour + 1) * 60
  if (i.date === i.today && i.nowMin !== undefined) dayStart = Math.max(dayStart, ceil15(i.nowMin + 10))
  const workEnd = Math.min(18 * 60 + 30, i.dayEndHour * 60 - 120)
  const leisureEnd = Math.min(22 * 60, i.dayEndHour * 60 - 60)

  // 1) Makan siang & makan malam bila slotnya kosong
  const santai = catId('Santai')
  const rumah = catId('Rumah') ?? santai
  const pasangan = catId('Pasangan')
  if (rumah && dayStart <= 12 * 60 && isFree(12 * 60, 13 * 60)) take({ title: 'Makan siang & rehat', start: 12 * 60, end: 13 * 60, categoryId: rumah })

  // 2) Kandidat: brain dump yang belum jadi tugas + tugas teratas
  const known = new Set(i.tasks.map((t) => t.title.trim().toLowerCase()))
  const newTasks: PlanNewTask[] = []
  const candidates: { title: string; categoryId: string; min: number; taskId?: string }[] = []
  for (const line of (i.brainDump ?? '').split(/\n+/)) {
    const text = line.replace(/^[-*•\d.)\s]+/, '').trim()
    if (text.length < 2) continue
    const p = parseQuickAdd(text, i.today, cats)
    if (!p.title || known.has(p.title.toLowerCase())) continue
    known.add(p.title.toLowerCase())
    const categoryId = p.categoryId ?? cats[0]?.id ?? 'skripsi'
    newTasks.push({ title: p.title, categoryId, priority: p.priority ?? 2, due: p.due ?? i.date, estimateMin: p.estimateMin })
    candidates.push({ title: p.title, categoryId, min: p.estimateMin ?? 30 })
  }
  // tugas dari daftar didahulukan (sudah terurut skor), brain dump menyusul
  const fromTasks = i.ranked.slice(0, 10).map(({ task }) => ({
    title: task.title,
    categoryId: task.categoryId,
    min: task.estimateMin ?? 60,
    taskId: task.id,
  }))
  const queue = [...fromTasks, ...candidates]

  // 3) Isi slot kerja
  let work = 0
  const scheduled: string[] = []
  for (const c of queue) {
    if (work >= MAX_WORK) break
    const need = Math.min(c.min, MAX_BLOCK, MAX_WORK - work)
    if (need < 15) break
    for (let s = ceil15(dayStart); s + Math.min(need, 30) <= workEnd; s += 15) {
      if (!isFree(s, s + 15)) continue
      // perpanjang sejauh slot kosong mengizinkan
      let e = s
      while (e < s + need && e < workEnd && isFree(e, e + 15)) e += 15
      if (e - s < Math.min(need, 30)) continue
      take({ title: c.title, start: s, end: e, categoryId: c.categoryId, taskId: c.taskId }, BREAK)
      work += e - s
      scheduled.push(c.title)
      break
    }
  }

  // 4) Sore/malam: makan malam, waktu berdua, santai
  const evening: [string, string | undefined, number][] = [
    ['Makan malam', rumah, 45],
    ['Waktu bareng pasangan', pasangan, 60],
    ['Santai bebas layar', santai, 45],
  ]
  let cursor = Math.max(workEnd, ceil15(dayStart))
  for (const [title, cat, len] of evening) {
    if (!cat) continue
    if (title.includes('pasangan') && i.fixed.some((f) => f.categoryId === pasangan)) continue
    while (cursor + len <= leisureEnd && !isFree(cursor, cursor + len)) cursor += 15
    if (cursor + len > leisureEnd) break
    take({ title, start: cursor, end: cursor + len, categoryId: cat })
    cursor += len
  }

  blocks.sort((a, b) => a.start - b.start)
  const left = queue.length - scheduled.length
  return {
    date: i.date,
    blocks,
    newTasks,
    top3: scheduled.slice(0, 3),
    notes: `Disusun otomatis: ${scheduled.length} blok kerja (${Math.round(work / 6) / 10} jam)${left > 0 ? `, ${left} tugas belum kebagian slot` : ''}. Sesuaikan bila perlu.`,
  }
}
