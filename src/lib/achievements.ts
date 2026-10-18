import type { DateKey, DayEntry, FocusSession, HabitLog, Invoice, Milestone, ScheduleEvent, Task } from '@/db/types'
import { toKey } from './date'

export interface AchievementData {
  sessions: FocusSession[]
  tasks: Task[]
  habitLogs: HabitLog[]
  /** Streak kebiasaan terpanjang (sudah dihitung) */
  bestHabitStreak: number
  milestones: Milestone[]
  invoices: Invoice[]
  events: ScheduleEvent[]
  days: DayEntry[]
  coupleCategory?: string
}

export interface Badge {
  id: string
  emoji: string
  name: string
  desc: string
  /** 0–1 */
  progress: number
  unlocked: boolean
}

/** XP: fokus 1/menit, tugas 10, centang kebiasaan 5, milestone 50, invoice lunas 20 */
export function xpOf(d: AchievementData) {
  const focus = d.sessions.reduce((a, s) => a + s.durationMin, 0)
  return (
    focus +
    d.tasks.filter((t) => t.done).length * 10 +
    d.habitLogs.length * 5 +
    d.milestones.filter((m) => m.done).length * 50 +
    d.invoices.filter((i) => i.status === 'paid').length * 20
  )
}

/** Gelar per rentang level (level minimum → gelar) */
const TITLES: [number, string][] = [
  [1, 'Baru mulai'],
  [2, 'Mulai berirama'],
  [4, 'Rutin'],
  [6, 'Konsisten'],
  [9, 'Fokus terlatih'],
  [12, 'Ahli ritme'],
  [16, 'Master ritme'],
  [21, 'Legenda'],
]
const STEP = 250

/**
 * Level n butuh 250·n·(n−1)/2 XP: L2=250, L3=750, L5=2.500, L10=11.250.
 * Dengan ±200 XP/hari (2 jam fokus + beberapa tugas), level 10 tercapai ±2 bulan.
 */
export function levelOf(xp: number) {
  const level = Math.floor((1 + Math.sqrt(1 + (8 * xp) / STEP)) / 2)
  const need = (n: number) => (STEP * n * (n - 1)) / 2
  const cur = need(level)
  const next = need(level + 1)
  const title = [...TITLES].reverse().find(([min]) => level >= min)![1]
  return { level, title, xp, into: xp - cur, span: next - cur }
}

const frac = (v: number, goal: number) => Math.min(1, v / goal)

export function badgesOf(d: AchievementData): Badge[] {
  const focusMin = d.sessions.reduce((a, s) => a + s.durationMin, 0)
  const done = d.tasks.filter((t) => t.done)
  const perDay = new Map<DateKey, number>()
  for (const t of done) if (t.doneAt) perDay.set(toKey(new Date(t.doneAt)), (perDay.get(toKey(new Date(t.doneAt))) ?? 0) + 1)
  const bestDay = Math.max(0, ...perDay.values())
  const early = d.sessions.some((s) => new Date(s.start).getHours() < 7)
  const night = d.sessions.some((s) => new Date(s.start).getHours() >= 22)
  const ms = d.milestones
  const msPct = ms.length ? ms.filter((m) => m.done).length / ms.length : 0
  const couple = d.coupleCategory ? d.events.filter((e) => e.categoryId === d.coupleCategory).length : 0
  const dumps = d.days.filter((x) => x.brainDump?.trim()).length
  const reflections = d.days.filter((x) => x.reflection && Object.values(x.reflection).some((v) => v?.trim())).length
  const paid = d.invoices.filter((i) => i.status === 'paid').length

  const list: Omit<Badge, 'unlocked'>[] = [
    { id: 'first_focus', emoji: '⏱️', name: 'Langkah pertama', desc: 'Selesaikan 1 sesi fokus', progress: frac(d.sessions.length, 1) },
    { id: 'focus_10h', emoji: '🔥', name: '10 jam fokus', desc: 'Total fokus 10 jam', progress: frac(focusMin, 600) },
    { id: 'focus_50h', emoji: '🚀', name: '50 jam fokus', desc: 'Total fokus 50 jam', progress: frac(focusMin, 3000) },
    { id: 'tasks_10', emoji: '✅', name: 'Pembereskan', desc: 'Selesaikan 10 tugas', progress: frac(done.length, 10) },
    { id: 'tasks_50', emoji: '🏆', name: 'Mesin produktif', desc: 'Selesaikan 50 tugas', progress: frac(done.length, 50) },
    { id: 'three_day', emoji: '🥉', name: 'Hari tiga besar', desc: '3 tugas selesai dalam sehari', progress: frac(bestDay, 3) },
    { id: 'streak_7', emoji: '📅', name: 'Seminggu penuh', desc: 'Streak kebiasaan 7 hari', progress: frac(d.bestHabitStreak, 7) },
    { id: 'streak_30', emoji: '💎', name: 'Sebulan konsisten', desc: 'Streak kebiasaan 30 hari', progress: frac(d.bestHabitStreak, 30) },
    { id: 'early_bird', emoji: '🌅', name: 'Burung pagi', desc: 'Mulai fokus sebelum 07.00', progress: early ? 1 : 0 },
    { id: 'night_owl', emoji: '🦉', name: 'Burung hantu', desc: 'Fokus setelah 22.00 (jangan sering-sering!)', progress: night ? 1 : 0 },
    { id: 'thesis_half', emoji: '📖', name: 'Setengah jalan', desc: '50% milestone skripsi selesai', progress: ms.length ? frac(msPct, 0.5) : 0 },
    { id: 'thesis_done', emoji: '🎓', name: 'Siap sidang', desc: 'Semua milestone skripsi selesai', progress: ms.length ? msPct : 0 },
    { id: 'first_paid', emoji: '💸', name: 'Cuan pertama', desc: 'Invoice pertama lunas', progress: frac(paid, 1) },
    { id: 'couple_5', emoji: '💞', name: 'Prioritaskan dia', desc: '5 kegiatan Bareng Pasangan', progress: frac(couple, 5) },
    { id: 'planner_7', emoji: '🧠', name: 'Perencana', desc: 'Brain dump di 7 hari berbeda', progress: frac(dumps, 7) },
    { id: 'reflect_7', emoji: '🌙', name: 'Reflektif', desc: 'Refleksi malam 7 kali', progress: frac(reflections, 7) },
  ]
  return list.map((b) => ({ ...b, progress: Math.round(b.progress * 100) / 100, unlocked: b.progress >= 1 }))
}
