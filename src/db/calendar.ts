import { db } from './db'
import { getSettings } from './settings'
import { shiftKey, todayKey } from '@/lib/date'
import { buildICS } from '@/lib/ics'
import { shareOrDownload } from '@/lib/shareImage'

/**
 * Ekspor jadwal (30 hari ke belakang + semua yang akan datang & berulang) dan tanggal penting
 * ke file .ics berisi alarm sesuai pengaturan pengingat, lalu bagikan/unduh.
 */
export async function exportCalendar() {
  const from = shiftKey(todayKey(), -30)
  const [events, cats, special, s] = await Promise.all([
    db.events.filter((e) => !!e.recurrence || !!e.seriesId || e.date >= from).toArray(),
    db.categories.toArray(),
    db.specialDates.toArray(),
    getSettings(),
  ])
  const ics = buildICS(events, new Map(cats.map((c) => [c.id, c])), special, {
    alarmAtStart: s.blockAlerts,
    alarmBeforeMin: s.eventReminderMin,
  })
  return shareOrDownload(new File([ics], `ritme-${todayKey()}.ics`, { type: 'text/calendar' }))
}
