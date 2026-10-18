import type { DateKey } from '@/db/types'
import { minToHHMM } from './date'

export interface Reminder {
  id: string
  title: string
  body: string
}

export interface ReminderInput {
  today: DateKey
  nowMin: number
  /** Kegiatan hari ini (sudah diekspansi) */
  events: { key: string; title: string; start: number }[]
  /** Menit sebelum mulai; 0 = mati */
  leadMin: number
  eveningHour: number
  tomorrowPlanned: boolean
  /** Id pengingat yang sudah dikirim */
  sent: Set<string>
}

/** Tentukan pengingat yang perlu dikirim sekarang (tidak mengirim ulang yang sudah terkirim) */
export function dueReminders(i: ReminderInput): Reminder[] {
  const out: Reminder[] = []
  if (i.leadMin > 0) {
    for (const e of i.events) {
      const id = `ev:${i.today}:${e.key}`
      const until = e.start - i.nowMin
      // kirim saat masuk jendela pengingat, tapi jangan untuk kegiatan yang sudah mulai > 1 menit
      if (until <= i.leadMin && until >= -1 && !i.sent.has(id))
        out.push({
          id,
          title: until <= 0 ? `Mulai sekarang: ${e.title}` : `${e.title} sebentar lagi`,
          body: until <= 0 ? `Jadwal ${minToHHMM(e.start)}.` : `Mulai ${minToHHMM(e.start)} (${until} menit lagi).`,
        })
    }
  }
  const eveningId = `evening:${i.today}`
  if (i.nowMin >= i.eveningHour * 60 && !i.tomorrowPlanned && !i.sent.has(eveningId))
    out.push({ id: eveningId, title: 'Besok mau ngapain?', body: 'Luangkan 5 menit untuk brain dump dan susun rencana besok.' })
  return out
}

/** Banner malam: tampil bila sudah lewat jam pengingat, besok belum ada rencana, dan belum ditutup hari ini */
export const showEveningBanner = (nowMin: number, eveningHour: number, tomorrowPlanned: boolean, dismissed: boolean) =>
  nowMin >= eveningHour * 60 && !tomorrowPlanned && !dismissed
