import type { DateKey } from '@/db/types'
import { minToHHMM } from './date'

export interface Reminder {
  id: string
  kind: 'pre' | 'start' | 'evening'
  title: string
  body: string
}

export interface ReminderInput {
  today: DateKey
  nowMin: number
  /** Kegiatan hari ini (sudah diekspansi), urut jam mulai */
  events: { key: string; title: string; start: number; end: number }[]
  /** Menit sebelum mulai untuk pengingat "sebentar lagi"; 0 = mati */
  leadMin: number
  /** Bunyi/notifikasi tepat saat kegiatan mulai (pergantian blok) */
  atStart: boolean
  eveningHour: number
  tomorrowPlanned: boolean
  /** Id pengingat yang sudah dikirim */
  sent: Set<string>
}

/** Telat paling lama segini (menit) masih dianggap "baru mulai" — jaga-jaga timer tertunda di latar */
const START_GRACE = 2

/** Tentukan pengingat yang perlu dikirim sekarang (tidak mengirim ulang yang sudah terkirim) */
export function dueReminders(i: ReminderInput): Reminder[] {
  const out: Reminder[] = []
  const events = [...i.events].sort((a, b) => a.start - b.start)
  events.forEach((e, k) => {
    const until = e.start - i.nowMin
    const pre = `pre:${i.today}:${e.key}`
    if (i.leadMin > 0 && until > 0 && until <= i.leadMin && !i.sent.has(pre))
      out.push({ id: pre, kind: 'pre', title: `${e.title} sebentar lagi`, body: `Mulai ${minToHHMM(e.start)} (${until} menit lagi).` })

    const start = `start:${i.today}:${e.key}`
    if (i.atStart && until <= 0 && until >= -START_GRACE && !i.sent.has(start)) {
      const next = events.slice(k + 1).find((x) => x.start >= e.end) ?? events.slice(k + 1).find((x) => x.start > e.start)
      out.push({
        id: start,
        kind: 'start',
        title: `Sekarang: ${e.title}`,
        body: `${minToHHMM(e.start)}–${minToHHMM(e.end)}${next ? ` · berikutnya ${minToHHMM(next.start)} ${next.title}` : ' · ini kegiatan terakhir hari ini'}`,
      })
    }
  })
  const eveningId = `evening:${i.today}`
  if (i.nowMin >= i.eveningHour * 60 && !i.tomorrowPlanned && !i.sent.has(eveningId))
    out.push({ id: eveningId, kind: 'evening', title: 'Besok mau ngapain?', body: 'Luangkan 5 menit untuk brain dump dan susun rencana besok.' })
  return out
}

/** Banner malam: tampil bila sudah lewat jam pengingat, besok belum ada rencana, dan belum ditutup hari ini */
export const showEveningBanner = (nowMin: number, eveningHour: number, tomorrowPlanned: boolean, dismissed: boolean) =>
  nowMin >= eveningHour * 60 && !tomorrowPlanned && !dismissed
