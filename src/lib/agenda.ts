import type { Task } from '@/db/types'
import { durationLabel, minToHHMM } from './date'
import type { Occurrence } from './schedule'

export interface Agenda {
  title: string
  body: string
  /** Tugas teratas untuk tombol "Selesai" / "Mulai fokus" */
  topTask?: Pick<Task, 'id' | 'title' | 'categoryId'>
  /** Jumlah untuk badge ikon: tugas belum selesai yang tenggatnya hari ini/terlewat */
  badge: number
}

/** Susun teks notifikasi "Agenda hari ini" */
export function buildAgenda(i: {
  nowMin: number
  events: Occurrence[]
  topTasks: Task[]
  dueCount: number
  habitsLeft: number
}): Agenda {
  const current = i.events.find((e) => e.start <= i.nowMin && e.end > i.nowMin)
  const upcoming = i.events.filter((e) => e.start > i.nowMin)
  const next = upcoming[0]
  const left = upcoming.length + (current ? 1 : 0)

  let title: string
  if (current) title = `Sekarang: ${current.title} (s/d ${minToHHMM(current.end)})`
  else if (next) title = `Berikutnya ${minToHHMM(next.start)}: ${next.title}`
  else if (i.events.length) title = 'Jadwal hari ini sudah lewat semua 🎉'
  else title = 'Hari ini masih kosong'

  const lines: string[] = []
  if (current && next) lines.push(`Lalu ${minToHHMM(next.start)} ${next.title} (dalam ${durationLabel(next.start - i.nowMin)})`)
  if (left > 1 || (left === 1 && !current && !next)) lines.push(`${left} kegiatan tersisa hari ini`)
  if (i.topTasks.length) lines.push(`Fokus: ${i.topTasks.map((t, k) => `${k + 1}. ${t.title}`).join(' · ')}`)
  if (i.habitsLeft > 0) lines.push(`🔥 ${i.habitsLeft} kebiasaan belum dicentang`)
  if (!lines.length) lines.push(i.events.length ? 'Waktunya santai. Mau rencanakan besok?' : 'Ketuk untuk menyusun jadwal hari ini.')

  const top = i.topTasks[0]
  return {
    title,
    body: lines.join('\n'),
    topTask: top ? { id: top.id, title: top.title, categoryId: top.categoryId } : undefined,
    badge: i.dueCount,
  }
}
