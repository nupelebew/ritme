import { z } from 'zod'
import type { Task } from '@/db/types'
import { DEFAULT_ABOUT } from '@/db/settings'
import { extractJson } from './schema'

/** Prompt "pecah tugas besar jadi langkah kecil" untuk ditempel ke Claude */
export function buildBreakdownPrompt(task: Task, opts: { about?: string; category?: string }) {
  const done = task.subtasks.filter((s) => s.done).map((s) => s.title)
  const left = task.subtasks.filter((s) => !s.done).map((s) => s.title)
  return [
    'Bantu aku memecah tugas ini menjadi langkah-langkah kecil yang konkret dan bisa langsung dikerjakan (masing-masing 10–60 menit).',
    '',
    `Tentang aku: ${(opts.about?.trim() || DEFAULT_ABOUT).replace(/\s*\n+\s*/g, ' ')}`,
    '',
    `Tugas: ${task.title}`,
    opts.category ? `Kategori: ${opts.category}` : '',
    task.due ? `Tenggat: ${task.due}` : '',
    task.notes ? `Catatan: ${task.notes}` : '',
    done.length ? `Sudah selesai: ${done.join('; ')}` : '',
    left.length ? `Sudah tercatat (jangan diulang): ${left.join('; ')}` : '',
    '',
    'Aturan: 3–8 langkah, urut dari yang paling awal, kata kerja di depan ("Baca…", "Tulis…"), langkah pertama harus sangat mudah dimulai.',
    'Balas HANYA dengan satu blok kode ```json``` seperti ini:',
    '```json',
    '{ "subtasks": [ { "title": "Kumpulkan 5 jurnal terkait", "estimateMin": 30 } ] }',
    '```',
  ]
    .filter((l, i, a) => l !== '' || a[i - 1] !== '')
    .join('\n')
}

const Schema = z.object({
  subtasks: z
    .array(z.object({ title: z.string().trim().min(2).max(120), estimateMin: z.coerce.number().int().min(1).max(600).optional().nullable() }))
    .min(1)
    .max(15),
})

export type BreakdownStep = { title: string; estimateMin?: number }

export function parseBreakdown(text: string): { steps?: BreakdownStep[]; error?: string } {
  const json = extractJson(text)
  if (!json) return { error: 'Tidak menemukan JSON. Tempel seluruh balasan Claude.' }
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch (e) {
    return { error: `JSON tidak valid: ${(e as Error).message}` }
  }
  const r = Schema.safeParse(raw)
  if (!r.success) return { error: `Format belum sesuai (${r.error.issues[0]?.path.join('.') || 'subtasks'}).` }
  return { steps: r.data.subtasks.map((s) => ({ title: s.title, estimateMin: s.estimateMin ?? undefined })) }
}

/** Cadangan tanpa AI: pola umum mengerjakan sesuatu */
export const GENERIC_STEPS: BreakdownStep[] = [
  { title: 'Tentukan hasil akhir yang dimaksud "selesai"', estimateMin: 10 },
  { title: 'Kumpulkan bahan / referensi yang dibutuhkan', estimateMin: 30 },
  { title: 'Buat kerangka atau langkah kasarnya', estimateMin: 20 },
  { title: 'Kerjakan draf pertama (boleh jelek)', estimateMin: 60 },
  { title: 'Revisi & rapikan', estimateMin: 30 },
  { title: 'Cek akhir lalu kirim / kumpulkan', estimateMin: 15 },
]
