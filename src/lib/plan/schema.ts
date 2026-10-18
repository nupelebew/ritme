import { z } from 'zod'
import type { Category, DateKey, Priority, Task } from '@/db/types'
import { hhmmToMin } from '@/lib/date'

/** Format JSON yang diminta dari Claude (dan dihasilkan penyusun otomatis) */
export const PlanSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date harus berformat YYYY-MM-DD'),
  blocks: z
    .array(
      z.object({
        title: z.string().trim().min(1, 'judul blok kosong').max(120),
        start: z.string(),
        end: z.string(),
        category: z.string().trim().min(1),
        taskId: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
      }),
    )
    .max(40, 'terlalu banyak blok (maks 40)'),
  newTasks: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(120),
        category: z.string().trim().min(1),
        priority: z.coerce.number().int().min(1).max(4).optional(),
        due: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
        estimateMin: z.coerce.number().int().min(5).max(600).optional().nullable(),
      }),
    )
    .max(30)
    .optional(),
  top3: z.array(z.string()).max(3).optional(),
  notes: z.string().max(1000).optional().nullable(),
})
export type PlanJSON = z.infer<typeof PlanSchema>

export interface PlanBlock {
  title: string
  start: number
  end: number
  categoryId: string
  taskId?: string
  notes?: string
}
export interface PlanNewTask {
  title: string
  categoryId: string
  priority: Priority
  due?: DateKey
  estimateMin?: number
}
export interface NormalizedPlan {
  date: DateKey
  blocks: PlanBlock[]
  newTasks: PlanNewTask[]
  top3: string[]
  notes?: string
}
export interface ValidationResult {
  plan?: NormalizedPlan
  errors: string[]
  warnings: string[]
}

/** Ambil objek JSON dari teks yang mungkin berisi ```json …``` atau kalimat pembuka */
export function extractJson(text: string): string | null {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const body = fence ? fence[1] : text
  const a = body.indexOf('{')
  const b = body.lastIndexOf('}')
  if (a === -1 || b <= a) return null
  return body.slice(a, b + 1)
}

export function matchCategory(name: string, categories: Category[]): Category | undefined {
  const q = name.trim().toLowerCase()
  return (
    categories.find((c) => c.id.toLowerCase() === q || c.name.toLowerCase() === q) ??
    categories.find((c) => c.name.toLowerCase().startsWith(q) || q.startsWith(c.name.toLowerCase())) ??
    categories.find((c) => c.name.toLowerCase().includes(q) || q.includes(c.name.toLowerCase().split(' ').pop()!))
  )
}

const fmtMin = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

/**
 * Validasi + normalisasi. Kesalahan fatal → `errors` (tidak bisa diterapkan).
 * Hal yang bisa diperbaiki otomatis → `warnings`.
 */
export function validatePlan(
  input: string | unknown,
  ctx: { categories: Category[]; tasks: Task[]; expectedDate?: DateKey; fixed?: { start: number; end: number; title: string }[] },
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  let raw: unknown = input
  if (typeof input === 'string') {
    const json = extractJson(input)
    if (!json) return { errors: ['Tidak menemukan JSON. Pastikan menempelkan seluruh balasan Claude.'], warnings }
    try {
      raw = JSON.parse(json)
    } catch (e) {
      return { errors: [`JSON tidak valid: ${(e as Error).message}`], warnings }
    }
  }
  const parsed = PlanSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      errors: parsed.error.issues.slice(0, 6).map((i) => `${i.path.join('.') || 'data'}: ${i.message}`),
      warnings,
    }
  }
  const p = parsed.data
  const active = ctx.categories.filter((c) => !c.archived)
  const fallback = active[0]
  const catOf = (name: string, where: string) => {
    const c = matchCategory(name, active)
    if (!c) warnings.push(`Kategori "${name}" (${where}) tidak dikenal, dipakai "${fallback?.name}".`)
    return (c ?? fallback)?.id ?? 'skripsi'
  }
  const taskIds = new Set(ctx.tasks.map((t) => t.id))

  if (ctx.expectedDate && p.date !== ctx.expectedDate)
    warnings.push(`Tanggal di JSON (${p.date}) berbeda dari yang direncanakan (${ctx.expectedDate}); dipakai ${ctx.expectedDate}.`)

  const blocks: PlanBlock[] = []
  p.blocks.forEach((b, i) => {
    const s = hhmmToMin(b.start)
    const e = hhmmToMin(b.end)
    const label = `Blok ${i + 1} "${b.title}"`
    if (Number.isNaN(s) || Number.isNaN(e)) return errors.push(`${label}: jam harus format HH:MM (dapat ${b.start}–${b.end}).`)
    if (e <= s) return errors.push(`${label}: jam selesai harus setelah jam mulai.`)
    let taskId = b.taskId ?? undefined
    if (taskId && !taskIds.has(taskId)) {
      warnings.push(`${label}: taskId tidak ditemukan, blok tetap dibuat tanpa tautan tugas.`)
      taskId = undefined
    }
    blocks.push({ title: b.title, start: s, end: e, categoryId: catOf(b.category, label), taskId, notes: b.notes ?? undefined })
  })
  blocks.sort((a, b) => a.start - b.start)
  for (let i = 1; i < blocks.length; i++)
    if (blocks[i].start < blocks[i - 1].end)
      warnings.push(`"${blocks[i - 1].title}" dan "${blocks[i].title}" bertumpuk (${fmtMin(blocks[i].start)}).`)
  for (const f of ctx.fixed ?? [])
    for (const b of blocks)
      if (b.start < f.end && f.start < b.end) warnings.push(`"${b.title}" bertabrakan dengan jadwal tetap "${f.title}".`)

  const newTasks: PlanNewTask[] = (p.newTasks ?? []).map((t) => ({
    title: t.title,
    categoryId: catOf(t.category, `tugas "${t.title}"`),
    priority: (t.priority ?? 2) as Priority,
    due: t.due ?? undefined,
    estimateMin: t.estimateMin ?? undefined,
  }))

  if (!blocks.length && !newTasks.length && !errors.length) errors.push('Rencana kosong: tidak ada blok maupun tugas baru.')

  return {
    plan: errors.length ? undefined : { date: ctx.expectedDate ?? p.date, blocks, newTasks, top3: p.top3 ?? [], notes: p.notes ?? undefined },
    errors,
    warnings: [...new Set(warnings)],
  }
}
