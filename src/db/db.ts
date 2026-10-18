import Dexie, { type EntityTable } from 'dexie'
import type {
  Category,
  DayEntry,
  FocusSession,
  Habit,
  HabitLog,
  ScheduleEvent,
  SettingRow,
  Task,
} from './types'

export class RitmeDB extends Dexie {
  categories!: EntityTable<Category, 'id'>
  events!: EntityTable<ScheduleEvent, 'id'>
  tasks!: EntityTable<Task, 'id'>
  habits!: EntityTable<Habit, 'id'>
  habitLogs!: EntityTable<HabitLog, 'id'>
  sessions!: EntityTable<FocusSession, 'id'>
  days!: EntityTable<DayEntry, 'date'>
  settings!: EntityTable<SettingRow, 'key'>

  constructor(name = 'ritme') {
    super(name)
    this.version(1).stores({
      categories: 'id, order',
      events: 'id, date, seriesId, categoryId',
      tasks: 'id, done, due, categoryId, doneAt',
      habits: 'id, order',
      habitLogs: 'id, habitId, date',
      sessions: 'id, date, categoryId, taskId, start',
      days: 'date',
      settings: 'key',
    })
    this.on('populate', (tx) => {
      tx.table('categories').bulkAdd(DEFAULT_CATEGORIES)
    })
  }
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'skripsi', name: 'Skripsi', color: '#8b5cf6', icon: 'graduation-cap', order: 0 },
  { id: 'freelance', name: 'Freelance', color: '#22d3ee', icon: 'briefcase', order: 1 },
  { id: 'rumah', name: 'Rumah', color: '#f59e0b', icon: 'home', order: 2 },
  { id: 'santai', name: 'Santai', color: '#34d399', icon: 'coffee', order: 3 },
  { id: 'pasangan', name: 'Bareng Pasangan', color: '#f472b6', icon: 'heart', order: 4 },
]

export const db = new RitmeDB()

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)
