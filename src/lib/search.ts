import type { DateKey, DayEntry, Guidance, Habit, Milestone, ScheduleEvent, Task } from '@/db/types'

export type HitKind = 'task' | 'event' | 'day' | 'habit' | 'milestone' | 'guidance'

export interface Hit {
  kind: HitKind
  id: string
  title: string
  /** Potongan teks di sekitar kata yang cocok */
  snippet?: string
  date?: DateKey
  done?: boolean
}

export const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

/** Semua kata kunci harus muncul (urutan bebas) */
export function matches(text: string, q: string) {
  const t = norm(text)
  return norm(q)
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => t.includes(w))
}

export function snippetOf(text: string, q: string, radius = 40) {
  const t = norm(text)
  const w = norm(q).split(/\s+/).filter(Boolean)[0] ?? ''
  const i = t.indexOf(w)
  if (i < 0) return text.slice(0, radius * 2)
  const a = Math.max(0, i - radius)
  const b = Math.min(text.length, i + w.length + radius)
  return `${a > 0 ? '…' : ''}${text.slice(a, b).replace(/\s+/g, ' ')}${b < text.length ? '…' : ''}`
}

export interface SearchData {
  tasks: Task[]
  events: ScheduleEvent[]
  days: DayEntry[]
  habits: Habit[]
  milestones: Milestone[]
  guidance: Guidance[]
}

/** Cari di semua data. Hasil terbatas per jenis supaya tetap cepat di HP. */
export function searchAll(q: string, d: SearchData, limit = 20): Hit[] {
  if (norm(q).trim().length < 2) return []
  const out: Hit[] = []
  const add = (h: Hit) => out.filter((x) => x.kind === h.kind).length < limit && out.push(h)

  for (const t of d.tasks) {
    const text = [t.title, t.notes, ...t.subtasks.map((s) => s.title)].filter(Boolean).join(' · ')
    if (matches(text, q)) add({ kind: 'task', id: t.id, title: t.title, snippet: matches(t.title, q) ? undefined : snippetOf(text, q), done: t.done, date: t.due })
  }
  // Kegiatan: satu hasil per judul (seri berulang tidak berulang-ulang)
  const seen = new Set<string>()
  for (const e of [...d.events].sort((a, b) => b.date.localeCompare(a.date))) {
    const text = [e.title, e.notes].filter(Boolean).join(' · ')
    const key = norm(e.title) + (e.recurrence ? '*' : e.date)
    if (seen.has(key) || !matches(text, q)) continue
    seen.add(key)
    add({ kind: 'event', id: e.id, title: e.title, date: e.date, snippet: e.recurrence ? 'berulang' : undefined })
  }
  for (const day of [...d.days].sort((a, b) => b.date.localeCompare(a.date))) {
    const r = day.reflection
    const text = [day.note, day.brainDump, r?.good, r?.block, r?.tomorrow].filter(Boolean).join(' · ')
    if (text && matches(text, q)) add({ kind: 'day', id: day.date, title: day.date, date: day.date, snippet: snippetOf(text, q) })
  }
  for (const h of d.habits) if (matches(h.name, q)) add({ kind: 'habit', id: h.id, title: `${h.emoji} ${h.name}` })
  for (const m of d.milestones) {
    const text = [m.title, m.notes].filter(Boolean).join(' · ')
    if (matches(text, q)) add({ kind: 'milestone', id: m.id, title: m.title, done: m.done, date: m.due })
  }
  for (const g of d.guidance) {
    const text = [g.lecturer, g.notes, ...g.revisions.map((r) => r.text)].filter(Boolean).join(' · ')
    if (matches(text, q)) add({ kind: 'guidance', id: g.id, title: `Bimbingan ${g.lecturer ?? ''}`.trim(), date: g.date, snippet: snippetOf(text, q) })
  }
  return out
}
