import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'

export interface Settings {
  theme: 'dark' | 'light' | 'system'
  dayStartHour: number
  dayEndHour: number
  focusMin: number
  shortBreakMin: number
  longBreakMin: number
  longBreakEvery: number
  /** Rutinitas tetap dalam kalimat bebas, dipakai di prompt AI */
  routines: string
  /** Jam (0-23) pengingat malam untuk merencanakan besok */
  eveningReminderHour: number
  notifications: boolean
  /** Menit sebelum kegiatan untuk pengingat; 0 = mati */
  eventReminderMin: number
  /** Notifikasi "Agenda hari ini" yang menetap */
  agendaNotif: boolean
  /** Angka tugas jatuh tempo di ikon aplikasi */
  badge: boolean
  /** Layar tetap menyala selama timer fokus berjalan */
  keepAwake: boolean
  name: string
  /** "Tentang saya" untuk prompt AI; kosong = deskripsi bawaan */
  about: string
  /** Tema warna aksen */
  accent: AccentId
  /** Target menit per minggu per kategori (id kategori → menit) */
  weeklyTargets: Record<string, number>
  /** Jam tidur target (0–24); 0 = tidak dipakai */
  bedtimeHour: number
  /** Ingatkan istirahat mata 20-20-20 saat fokus */
  eyeBreak: boolean
  /** Suara latar saat fokus */
  noise: NoiseKind
  /** Tanggal target sidang (YYYY-MM-DD) */
  defenseDate: string
  /** Kapan terakhir ekspor cadangan (epoch ms) */
  lastBackupAt: number
  /** ID kredensial WebAuthn untuk kunci aplikasi; kosong = mati */
  appLock: string
  /** Lencana yang sudah terbuka (agar notifikasi lencana tidak berulang) */
  unlockedBadges: string[]
}

export type AccentId = 'aurora' | 'sunset' | 'ocean' | 'forest' | 'sakura'
export type NoiseKind = 'off' | 'white' | 'pink' | 'brown' | 'rain'

export const DEFAULT_ABOUT =
  'Mahasiswa tingkat akhir yang sedang mengerjakan skripsi. Baru mulai freelance, jam kerjanya belum tetap. Banyak beraktivitas di rumah; butuh waktu santai dan waktu bareng pasangan.'

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  dayStartHour: 6,
  dayEndHour: 24,
  focusMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  longBreakEvery: 4,
  routines: '',
  eveningReminderHour: 20,
  notifications: false,
  eventReminderMin: 10,
  agendaNotif: true,
  badge: true,
  keepAwake: true,
  name: '',
  about: '',
  accent: 'aurora',
  weeklyTargets: {},
  bedtimeHour: 0,
  eyeBreak: false,
  noise: 'off',
  defenseDate: '',
  lastBackupAt: 0,
  appLock: '',
  unlockedBadges: [],
}

export async function getSettings(): Promise<Settings> {
  const rows = await db.settings.toArray()
  const out = { ...DEFAULT_SETTINGS } as Record<string, unknown>
  for (const r of rows) if (r.key in out) out[r.key] = r.value
  return out as unknown as Settings
}

export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  await db.settings.put({ key, value })
}

export function useSettings(): Settings {
  return useLiveQuery(getSettings, [], DEFAULT_SETTINGS)
}
