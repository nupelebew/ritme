import Dexie, { type EntityTable } from 'dexie'
import type {
  Category,
  Client,
  DateIdea,
  DayEntry,
  DayTemplate,
  FocusSession,
  Guidance,
  Habit,
  HabitLog,
  Invoice,
  Milestone,
  ScheduleEvent,
  SettingRow,
  SpecialDate,
  Task,
  TrashItem,
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
  // v2
  milestones!: EntityTable<Milestone, 'id'>
  guidance!: EntityTable<Guidance, 'id'>
  clients!: EntityTable<Client, 'id'>
  invoices!: EntityTable<Invoice, 'id'>
  templates!: EntityTable<DayTemplate, 'id'>
  trash!: EntityTable<TrashItem, 'id'>
  specialDates!: EntityTable<SpecialDate, 'id'>
  dateIdeas!: EntityTable<DateIdea, 'id'>

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
    // v2: tabel baru saja; data v1 tidak berubah, jadi tidak perlu .upgrade()
    this.version(2).stores({
      tasks: 'id, done, due, categoryId, doneAt, milestoneId, clientId',
      milestones: 'id, order',
      guidance: 'id, date',
      clients: 'id',
      invoices: 'id, clientId, status, date',
      templates: 'id',
      trash: 'id, deletedAt',
      specialDates: 'id',
      dateIdeas: 'id',
    })
    this.on('populate', (tx) => {
      tx.table('categories').bulkAdd(DEFAULT_CATEGORIES)
    })
  }
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'skripsi', name: 'Skripsi', color: '#8b5cf6', icon: 'graduation-cap', order: 0 },
  { id: 'freelance', name: 'Freelance', color: '#0891b2', icon: 'briefcase', order: 1 },
  { id: 'rumah', name: 'Rumah', color: '#d97706', icon: 'home', order: 2 },
  { id: 'santai', name: 'Santai', color: '#16a34a', icon: 'coffee', order: 3 },
  { id: 'pasangan', name: 'Bareng Pasangan', color: '#c026d3', icon: 'heart', order: 4 },
]

export const db = new RitmeDB()

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)
