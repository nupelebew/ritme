import type { RitmeDB } from './db'
import { uid } from './db'
import type { DateKey, DayTemplate, ScheduleEvent } from './types'

/** Simpan kegiatan sekali-jalan di tanggal itu sebagai template hari */
export async function saveTemplateFromDay(db: RitmeDB, date: DateKey, name: string, emoji: string) {
  const events = await db.events.where('date').equals(date).filter((e) => !e.recurrence).sortBy('start')
  if (!events.length) return null
  const tpl: DayTemplate = {
    id: uid(),
    name,
    emoji,
    blocks: events.map((e) => ({ title: e.title, categoryId: e.categoryId, start: e.start, end: e.end })),
    createdAt: Date.now(),
  }
  await db.templates.add(tpl)
  return tpl
}

/**
 * Terapkan template ke tanggal. Blok yang bertabrakan dengan kegiatan yang sudah ada dilewati.
 * Mengembalikan jumlah blok yang dibuat, yang dilewati, dan fungsi urungkan.
 */
export async function applyTemplate(db: RitmeDB, tpl: DayTemplate, date: DateKey, existing: { start: number; end: number }[]) {
  const now = Date.now()
  const created: ScheduleEvent[] = []
  let skipped = 0
  for (const b of tpl.blocks) {
    const clash = [...existing, ...created].some((e) => b.start < e.end && e.start < b.end)
    if (clash) {
      skipped++
      continue
    }
    created.push({ id: uid(), title: b.title, categoryId: b.categoryId, date, start: b.start, end: b.end, createdAt: now + created.length })
  }
  await db.events.bulkAdd(created)
  return { created: created.length, skipped, undo: () => db.events.bulkDelete(created.map((e) => e.id)) }
}
