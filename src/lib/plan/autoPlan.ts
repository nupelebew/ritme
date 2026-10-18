import type { Category, DateKey, Task } from '@/db/types'
import { adjustEstimate, type EstimateStats } from '@/lib/insights'
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
  /** Energi 1–5: rendah → beban kerja & blok lebih pendek, jeda lebih panjang */
  energy?: number
  /** Jam tidur (0 = tidak dipakai): kegiatan malam selesai 30 menit sebelumnya */
  bedtimeHour?: number
  /** Jam emas [mulai, selesai) — tugas penting ditaruh di sini lebih dulu */
  golden?: [number, number]
  /** Kebiasaan meleset estimasi */
  estimate?: EstimateStats | null
  /** Kategori yang tertinggal dari target mingguan */
  behind?: string[]
}

const MAX_BLOCK = 120
const ceil15 = (m: number) => Math.ceil(m / 15) * 15

/** Batas kerja harian, panjang blok maksimum, dan jeda berdasarkan energi */
export function energyProfile(energy?: number) {
  if (energy !== undefined && energy <= 2) return { maxWork: 3 * 60, maxBlock: 60, breakMin: 20 }
  if (energy === 3) return { maxWork: 5 * 60, maxBlock: 90, breakMin: 15 }
  return { maxWork: 6 * 60, maxBlock: MAX_BLOCK, breakMin: 15 }
}

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
  const { maxWork, maxBlock, breakMin } = energyProfile(i.energy)
  const behind = new Set(i.behind ?? [])

  let dayStart = (i.dayStartHour + 1) * 60
  if (i.date === i.today && i.nowMin !== undefined) dayStart = Math.max(dayStart, ceil15(i.nowMin + 10))
  const bed = i.bedtimeHour ? i.bedtimeHour * 60 - 30 : Infinity
  const workEnd = Math.min(18 * 60 + 30, i.dayEndHour * 60 - 120, bed - 120)
  const leisureEnd = Math.min(22 * 60, i.dayEndHour * 60 - 60, bed)

  // 1) Makan siang bila slotnya kosong
  const santai = catId('Santai')
  const rumah = catId('Rumah') ?? santai
  const pasangan = catId('Pasangan')
  if (rumah && dayStart <= 12 * 60 && isFree(12 * 60, 13 * 60)) take({ title: 'Makan siang & rehat', start: 12 * 60, end: 13 * 60, categoryId: rumah })

  // 2) Kandidat: tugas teratas + brain dump yang belum jadi tugas
  const known = new Set(i.tasks.map((t) => t.title.trim().toLowerCase()))
  const newTasks: PlanNewTask[] = []
  const candidates: { title: string; categoryId: string; min: number; taskId?: string; rank: number }[] = []
  i.ranked.slice(0, 10).forEach(({ task }, k) =>
    candidates.push({
      title: task.title,
      categoryId: task.categoryId,
      min: adjustEstimate(task.estimateMin ?? 60, i.estimate ?? null),
      taskId: task.id,
      // kategori yang tertinggal target naik 3 peringkat
      rank: k - (behind.has(task.categoryId) ? 3 : 0),
    }),
  )
  for (const line of (i.brainDump ?? '').split(/\n+/)) {
    const text = line.replace(/^[-*•\d.)\s]+/, '').trim()
    if (text.length < 2) continue
    const p = parseQuickAdd(text, i.today, cats)
    if (!p.title || known.has(p.title.toLowerCase())) continue
    known.add(p.title.toLowerCase())
    const categoryId = p.categoryId ?? cats[0]?.id ?? 'skripsi'
    newTasks.push({ title: p.title, categoryId, priority: p.priority ?? 2, due: p.due ?? i.date, estimateMin: p.estimateMin })
    candidates.push({ title: p.title, categoryId, min: p.estimateMin ?? 30, rank: 100 + candidates.length })
  }
  const queue = [...candidates].sort((a, b) => a.rank - b.rank)

  // Urutan jam mulai yang dicoba: jam emas dulu (untuk 3 tugas teratas), lalu kronologis
  const starts: number[] = []
  for (let s = ceil15(dayStart); s < workEnd; s += 15) starts.push(s)
  const inGolden = (s: number) => !!i.golden && s >= i.golden[0] * 60 && s < i.golden[1] * 60
  const goldenFirst = [...starts.filter(inGolden), ...starts.filter((s) => !inGolden(s))]

  // 3) Isi slot kerja
  let work = 0
  const scheduled: string[] = []
  queue.forEach((c, k) => {
    if (work >= maxWork) return
    const need = Math.min(c.min, maxBlock, maxWork - work)
    if (need < 15) return
    for (const s of k < 3 ? goldenFirst : starts) {
      if (s + Math.min(need, 30) > workEnd || !isFree(s, s + 15)) continue
      // perpanjang sejauh slot kosong mengizinkan
      let e = s
      while (e < s + need && e < workEnd && isFree(e, e + 15)) e += 15
      if (e - s < Math.min(need, 30)) continue
      take({ title: c.title, start: s, end: e, categoryId: c.categoryId, taskId: c.taskId }, breakMin)
      work += e - s
      scheduled.push(c.title)
      return
    }
  })

  // 4) Sore/malam: makan malam, waktu berdua, santai (lebih lama bila tertinggal target)
  const evening: [string, string | undefined, number][] = [
    ['Makan malam', rumah, 45],
    ['Waktu bareng pasangan', pasangan, pasangan && behind.has(pasangan) ? 90 : 60],
    ['Santai bebas layar', santai, santai && behind.has(santai) ? 75 : 45],
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
  const extras = [
    i.energy !== undefined && i.energy <= 2 ? 'beban dikurangi karena energi rendah' : '',
    i.golden ? `tugas utama di jam emas ${String(i.golden[0]).padStart(2, '0')}–${String(i.golden[1]).padStart(2, '0')}` : '',
  ].filter(Boolean)
  return {
    date: i.date,
    blocks,
    newTasks,
    top3: scheduled.slice(0, 3),
    notes: `Disusun otomatis: ${scheduled.length} blok kerja (${Math.round(work / 6) / 10} jam)${left > 0 ? `, ${left} tugas belum kebagian slot` : ''}${extras.length ? `; ${extras.join(', ')}` : ''}. Sesuaikan bila perlu.`,
  }
}
