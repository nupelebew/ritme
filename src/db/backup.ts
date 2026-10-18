import { z } from 'zod'
import type { RitmeDB } from './db'
import type { DayEntry, FocusSession, Priority, Task } from './types'
import { parseCSV, toCSV } from '@/lib/csv'
import { toKey } from '@/lib/date'

export const TABLES = [
  'categories',
  'events',
  'tasks',
  'habits',
  'habitLogs',
  'sessions',
  'days',
  'settings',
  'milestones',
  'guidance',
  'clients',
  'invoices',
  'templates',
  'trash',
  'specialDates',
  'dateIdeas',
] as const
type TableName = (typeof TABLES)[number]

export const TABLE_LABEL: Record<TableName, string> = {
  categories: 'kategori',
  events: 'kegiatan',
  tasks: 'tugas',
  habits: 'kebiasaan',
  habitLogs: 'centang kebiasaan',
  sessions: 'sesi fokus',
  days: 'catatan harian',
  settings: 'pengaturan',
  milestones: 'milestone skripsi',
  guidance: 'log bimbingan',
  clients: 'klien',
  invoices: 'invoice',
  templates: 'template hari',
  trash: 'tempat sampah',
  specialDates: 'tanggal penting',
  dateIdeas: 'ide kencan',
}

const withId = z.object({ id: z.string().min(1) }).passthrough()
const BackupSchema = z.object({
  app: z.literal('ritme'),
  version: z.number().int().min(1),
  exportedAt: z.string().optional(),
  data: z.object({
    categories: z.array(withId).default([]),
    events: z.array(withId).default([]),
    tasks: z.array(withId).default([]),
    habits: z.array(withId).default([]),
    habitLogs: z.array(withId).default([]),
    sessions: z.array(withId).default([]),
    days: z.array(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).passthrough()).default([]),
    settings: z.array(z.object({ key: z.string(), value: z.unknown() }).passthrough()).default([]),
    // v2 — cadangan v1 tidak punya kolom ini, jadi semuanya opsional
    milestones: z.array(withId).default([]),
    guidance: z.array(withId).default([]),
    clients: z.array(withId).default([]),
    invoices: z.array(withId).default([]),
    templates: z.array(withId).default([]),
    trash: z.array(withId).default([]),
    specialDates: z.array(withId).default([]),
    dateIdeas: z.array(withId).default([]),
  }),
})
export type Backup = z.infer<typeof BackupSchema>

export async function exportBackup(db: RitmeDB): Promise<Backup> {
  const data = Object.fromEntries(await Promise.all(TABLES.map(async (t) => [t, await db.table(t).toArray()]))) as Backup['data']
  return { app: 'ritme', version: 2, exportedAt: new Date().toISOString(), data }
}

export function parseBackup(text: string): { backup?: Backup; error?: string } {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { error: 'File bukan JSON yang valid.' }
  }
  const r = BackupSchema.safeParse(raw)
  if (!r.success) return { error: `Bukan file cadangan Ritme yang valid (${r.error.issues[0]?.path.join('.') || 'format'}).` }
  return { backup: r.data }
}

export const countBackup = (b: Backup) => Object.fromEntries(TABLES.map((t) => [t, b.data[t].length])) as Record<TableName, number>

/**
 * Pulihkan cadangan.
 * - 'merge': data dengan id sama ditimpa, sisanya ditambahkan.
 * - 'replace': semua data lama dihapus dulu.
 * Mengembalikan fungsi urungkan (memulihkan keadaan sebelum impor).
 */
export async function importBackup(db: RitmeDB, b: Backup, mode: 'merge' | 'replace') {
  const before = await exportBackup(db)
  // Kunci aplikasi terikat ke perangkat: jangan ikut diimpor, dan pertahankan milik perangkat ini
  const lock = await db.settings.get('appLock')
  await writeAll(db, { ...b, data: { ...b.data, settings: b.data.settings.filter((r) => r.key !== 'appLock') } }, mode)
  if (lock) await db.settings.put(lock)
  else await db.settings.delete('appLock')
  return () => writeAll(db, before, 'replace')
}

async function writeAll(db: RitmeDB, b: Backup, mode: 'merge' | 'replace') {
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      if (mode === 'replace') await db.table(t).clear()
      if (b.data[t].length) await db.table(t).bulkPut(b.data[t])
    }
  })
}

/* ---------------- CSV ---------------- */

export type CsvKind = 'sessions' | 'tasks' | 'days'
export const CSV_LABEL: Record<CsvKind, string> = { sessions: 'Sesi fokus', tasks: 'Tugas', days: 'Riwayat harian' }

export async function exportCSV(db: RitmeDB, kind: CsvKind): Promise<string> {
  const cats = new Map((await db.categories.toArray()).map((c) => [c.id, c.name]))
  if (kind === 'sessions') {
    const rows = (await db.sessions.orderBy('start').toArray()).map((s) => ({
      ...s,
      startTime: new Date(s.start).toISOString(),
      endTime: new Date(s.end).toISOString(),
      category: cats.get(s.categoryId ?? '') ?? '',
    }))
    return toCSV(rows, ['id', 'date', 'startTime', 'endTime', 'durationMin', 'category', 'categoryId', 'taskId', 'completed'])
  }
  if (kind === 'tasks') {
    const rows = (await db.tasks.toArray()).map((t) => ({
      ...t,
      category: cats.get(t.categoryId) ?? '',
      doneDate: t.doneAt ? toKey(new Date(t.doneAt)) : '',
      subtasksDone: t.subtasks.filter((s) => s.done).length,
      subtasksTotal: t.subtasks.length,
    }))
    return toCSV(rows, ['id', 'title', 'category', 'categoryId', 'priority', 'due', 'estimateMin', 'done', 'doneDate', 'subtasksDone', 'subtasksTotal', 'notes'])
  }
  const [days, sessions, tasks] = await Promise.all([db.days.toArray(), db.sessions.toArray(), db.tasks.toArray()])
  const dates = new Set([...days.map((d) => d.date), ...sessions.map((s) => s.date)])
  const rows = [...dates].sort().map((date) => {
    const d = days.find((x) => x.date === date)
    return {
      date,
      mood: d?.mood ?? '',
      note: d?.note ?? '',
      focusMin: sessions.filter((s) => s.date === date).reduce((a, s) => a + s.durationMin, 0),
      tasksDone: tasks.filter((t) => t.doneAt && toKey(new Date(t.doneAt)) === date).length,
    }
  })
  return toCSV(rows, ['date', 'mood', 'note', 'focusMin', 'tasksDone'])
}

/** Kenali jenis CSV dari header-nya */
export function detectCsv(rows: Record<string, string>[]): CsvKind | null {
  const h = Object.keys(rows[0] ?? {})
  if (h.includes('durationMin') && h.includes('date')) return 'sessions'
  if (h.includes('title') && h.includes('priority')) return 'tasks'
  if (h.includes('date') && (h.includes('mood') || h.includes('note'))) return 'days'
  return null
}

const bool = (s: string) => /^(true|1|ya|yes)$/i.test(s.trim())
const num = (s: string) => (s.trim() === '' || Number.isNaN(Number(s)) ? undefined : Number(s))

/** Impor CSV (gabung). Mengembalikan jumlah baris + fungsi urungkan. */
export async function importCSV(db: RitmeDB, text: string) {
  const rows = parseCSV(text)
  const kind = detectCsv(rows)
  if (!kind) throw new Error('Kolom CSV tidak dikenali. Gunakan CSV hasil ekspor Ritme (sesi, tugas, atau riwayat harian).')
  const cats = await db.categories.toArray()
  const catId = (r: Record<string, string>) =>
    (r.categoryId && cats.find((c) => c.id === r.categoryId)?.id) ||
    cats.find((c) => c.name.toLowerCase() === (r.category ?? '').toLowerCase())?.id ||
    cats[0]?.id ||
    'skripsi'

  const snapshot = await exportBackup(db)
  const undo = () => writeAll(db, snapshot, 'replace')

  if (kind === 'sessions') {
    const items: FocusSession[] = rows
      .filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.date) && num(r.durationMin))
      .map((r, i) => {
        const start = r.startTime ? Date.parse(r.startTime) : Date.parse(`${r.date}T12:00:00`)
        const dur = num(r.durationMin)!
        return {
          id: r.id || `csv-${Date.now()}-${i}`,
          date: r.date,
          start,
          end: r.endTime ? Date.parse(r.endTime) : start + dur * 60_000,
          durationMin: dur,
          categoryId: catId(r),
          taskId: r.taskId || undefined,
          completed: r.completed ? bool(r.completed) : true,
        }
      })
    await db.sessions.bulkPut(items)
    return { kind, count: items.length, undo }
  }
  if (kind === 'tasks') {
    const existing = new Map((await db.tasks.toArray()).map((t) => [t.id, t]))
    const items: Task[] = rows
      .filter((r) => r.title?.trim())
      .map((r, i) => {
        const old = existing.get(r.id)
        const done = bool(r.done ?? '')
        return {
          ...(old ?? { subtasks: [], createdAt: Date.now() + i }),
          id: r.id || `csv-${Date.now()}-${i}`,
          title: r.title.trim(),
          categoryId: catId(r),
          priority: (Math.min(4, Math.max(1, num(r.priority) ?? 2)) as Priority),
          due: /^\d{4}-\d{2}-\d{2}$/.test(r.due ?? '') ? r.due : undefined,
          estimateMin: num(r.estimateMin),
          notes: r.notes || undefined,
          done,
          doneAt: done ? (r.doneDate ? Date.parse(`${r.doneDate}T12:00:00`) : old?.doneAt ?? Date.now()) : undefined,
        }
      })
    await db.tasks.bulkPut(items)
    return { kind, count: items.length, undo }
  }
  const items: DayEntry[] = []
  for (const r of rows) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date)) continue
    const old = await db.days.get(r.date)
    const mood = num(r.mood)
    items.push({
      ...(old ?? { date: r.date }),
      mood: mood && mood >= 1 && mood <= 5 ? (mood as DayEntry['mood']) : old?.mood,
      note: r.note || old?.note,
    })
  }
  await db.days.bulkPut(items)
  return { kind, count: items.length, undo }
}

export function download(filename: string, text: string, type: string) {
  const blob = new Blob([type.includes('csv') ? '﻿' + text : text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
