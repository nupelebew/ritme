import type { Category, DateKey, ScheduleEvent, SpecialDate } from '@/db/types'
import { shiftKey } from './date'

const DAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

/** Waktu lokal "mengambang" (tanpa zona) — kalender menampilkannya sesuai jam HP */
function dt(date: DateKey, min: number) {
  const d = min >= 1440 ? shiftKey(date, 1) : date
  const m = min % 1440
  return `${d.replace(/-/g, '')}T${String(Math.floor(m / 60)).padStart(2, '0')}${String(m % 60).padStart(2, '0')}00`
}

/** Lipat baris > 75 oktet sesuai RFC 5545 */
function fold(line: string) {
  const out: string[] = []
  let cur = ''
  let bytes = 0
  for (const ch of line) {
    const b = new TextEncoder().encode(ch).length
    if (bytes + b > 74) {
      out.push(cur)
      cur = ' '
      bytes = 1
    }
    cur += ch
    bytes += b
  }
  out.push(cur)
  return out.join('\r\n')
}

const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')

/**
 * Jadwal Ritme → file .ics.
 * Seri berulang jadi RRULE (+EXDATE); kejadian yang diubah sekali jadi VEVENT dengan RECURRENCE-ID.
 * Tanggal penting tahunan jadi acara seharian berulang tiap tahun.
 */
export function buildICS(events: ScheduleEvent[], categories: Map<string, Category>, special: SpecialDate[] = [], calName = 'Ritme') {
  const L: string[] = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Ritme//Jadwal Harian//ID', 'CALSCALE:GREGORIAN', `X-WR-CALNAME:${esc(calName)}`]
  const masters = new Map(events.filter((e) => e.recurrence).map((e) => [e.id, e]))
  const ts = stamp()

  for (const e of events) {
    const cat = categories.get(e.categoryId)?.name
    const uid = `${e.seriesId ?? e.id}@ritme`
    L.push('BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${ts}`, `DTSTART:${dt(e.date, e.start)}`, `DTEND:${dt(e.date, e.end)}`, `SUMMARY:${esc(e.title)}`)
    if (cat) L.push(`CATEGORIES:${esc(cat)}`)
    if (e.notes) L.push(`DESCRIPTION:${esc(e.notes)}`)
    if (e.recurrence) {
      const r = e.recurrence
      const until = r.until ? `;UNTIL=${r.until.replace(/-/g, '')}T235959` : ''
      L.push(r.freq === 'daily' ? `RRULE:FREQ=DAILY${until}` : `RRULE:FREQ=WEEKLY;BYDAY=${(r.days ?? []).map((d) => DAY[d]).join(',')}${until}`)
      for (const x of e.exceptions ?? []) {
        // tanggal yang punya pengganti tidak di-EXDATE (RECURRENCE-ID yang menggantikannya)
        if (!events.some((o) => o.seriesId === e.id && o.date === x)) L.push(`EXDATE:${dt(x, e.start)}`)
      }
    }
    if (e.seriesId) {
      const m = masters.get(e.seriesId)
      if (m) L.push(`RECURRENCE-ID:${dt(e.date, m.start)}`)
    }
    L.push('END:VEVENT')
  }

  for (const s of special) {
    const d = s.date.replace(/-/g, '')
    L.push('BEGIN:VEVENT', `UID:${s.id}@ritme-tanggal`, `DTSTAMP:${ts}`, `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${shiftKey(s.date, 1).replace(/-/g, '')}`, `SUMMARY:${esc(`${s.emoji} ${s.title}`)}`)
    if (s.yearly) L.push('RRULE:FREQ=YEARLY')
    L.push('END:VEVENT')
  }
  L.push('END:VCALENDAR')
  return L.map(fold).join('\r\n') + '\r\n'
}
