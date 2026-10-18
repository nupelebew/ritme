/** Tanggal lokal format YYYY-MM-DD */
export type DateKey = string

export interface Category {
  id: string
  name: string
  /** Warna hex, dipakai untuk blok timeline, grafik, dll. */
  color: string
  icon: string
  order: number
  archived?: boolean
}

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface Recurrence {
  freq: 'daily' | 'weekly'
  /** Untuk weekly: hari yang aktif (0 = Minggu) */
  days?: Weekday[]
  until?: DateKey
}

/** Blok kegiatan di timeline. Menit dihitung dari 00:00. */
export interface ScheduleEvent {
  id: string
  title: string
  categoryId: string
  date: DateKey
  start: number
  end: number
  notes?: string
  recurrence?: Recurrence
  /** Tanggal yang dilewati dari seri berulang (karena dihapus/diubah satu kali) */
  exceptions?: DateKey[]
  /** Kalau ini pengganti satu kejadian dari seri berulang */
  seriesId?: string
  taskId?: string
  createdAt: number
}

export type Priority = 1 | 2 | 3 | 4

export interface Subtask {
  id: string
  title: string
  done: boolean
}

export interface Task {
  id: string
  title: string
  categoryId: string
  priority: Priority
  due?: DateKey
  estimateMin?: number
  notes?: string
  subtasks: Subtask[]
  done: boolean
  doneAt?: number
  createdAt: number
  /** Tertaut ke milestone skripsi */
  milestoneId?: string
  /** Tertaut ke klien freelance (jam fokusnya jadi jam tertagih) */
  clientId?: string
}

export interface Habit {
  id: string
  name: string
  emoji: string
  color: string
  categoryId?: string
  /** Hari target; kosong = setiap hari */
  days?: Weekday[]
  order: number
  archived?: boolean
  createdAt: number
}

export interface HabitLog {
  /** `${habitId}_${date}` */
  id: string
  habitId: string
  date: DateKey
}

export interface FocusSession {
  id: string
  start: number
  end: number
  durationMin: number
  date: DateKey
  categoryId?: string
  taskId?: string
  completed: boolean
}

export interface DayEntry {
  date: DateKey
  mood?: 1 | 2 | 3 | 4 | 5
  note?: string
  brainDump?: string
  /** Check-in energi pagi 1–5 */
  energy?: 1 | 2 | 3 | 4 | 5
  /** Refleksi malam singkat */
  reflection?: { good?: string; block?: string; tomorrow?: string }
}

/* ---------- v2 ---------- */

export interface Milestone {
  id: string
  title: string
  due?: DateKey
  done: boolean
  doneAt?: number
  order: number
  notes?: string
}

export interface Revision {
  id: string
  text: string
  taskId?: string
}

/** Log bimbingan dosen */
export interface Guidance {
  id: string
  date: DateKey
  lecturer?: string
  notes?: string
  revisions: Revision[]
  createdAt: number
}

export interface Client {
  id: string
  name: string
  /** Tarif dalam rupiah; per jam atau per proyek */
  rate?: number
  rateType: 'hour' | 'project'
  color: string
  archived?: boolean
  createdAt: number
}

export interface Invoice {
  id: string
  clientId: string
  title: string
  amount: number
  status: 'unpaid' | 'paid'
  date: DateKey
  due?: DateKey
  paidAt?: number
}

export interface TemplateBlock {
  title: string
  categoryId: string
  start: number
  end: number
}

export interface DayTemplate {
  id: string
  name: string
  emoji: string
  blocks: TemplateBlock[]
  createdAt: number
}

export interface TrashItem {
  id: string
  kind: 'task' | 'event' | 'series' | 'habit'
  label: string
  /** Snapshot data yang dihapus (bisa beberapa baris untuk satu seri) */
  data: unknown
  deletedAt: number
}

/** Tanggal penting: anniversary, ulang tahun, dll. */
export interface SpecialDate {
  id: string
  title: string
  emoji: string
  /** YYYY-MM-DD; bila yearly, hanya bulan & tanggal yang dipakai untuk hitung mundur */
  date: DateKey
  yearly: boolean
  createdAt: number
}

export interface DateIdea {
  id: string
  title: string
  done: boolean
  createdAt: number
}

export interface SettingRow {
  key: string
  value: unknown
}
