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
}

export interface SettingRow {
  key: string
  value: unknown
}
