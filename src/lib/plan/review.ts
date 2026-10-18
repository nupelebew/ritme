import type { Category, DateKey, Habit, Task } from '@/db/types'
import { DEFAULT_ABOUT } from '@/db/settings'
import { durationLabel, fmt } from '@/lib/date'

export interface WeekDay {
  date: DateKey
  focusMin: number
  plannedMin: number
  tasksDone: number
  mood?: number
  note?: string
}

export interface WeekData {
  start: DateKey
  end: DateKey
  days: WeekDay[]
  focusByCat: Record<string, number>
  plannedByCat: Record<string, number>
  tasksDone: Task[]
  overdue: Task[]
  habits: { habit: Habit; done: number; due: number }[]
}

export const sumValues = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0)

export function buildReviewPrompt(w: WeekData, categories: Category[], name?: string, about?: string): string {
  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? 'Lainnya'
  const L: string[] = []
  const focusTotal = sumValues(w.focusByCat)
  const allCats = new Set([...Object.keys(w.focusByCat), ...Object.keys(w.plannedByCat)])

  L.push(
    `Tolong bantu aku mengevaluasi minggu ${fmt(w.start, 'd MMM')}–${fmt(w.end, 'd MMM yyyy')}${name ? ` (aku ${name})` : ''}.`,
    `Tentang aku: ${(about?.trim() || DEFAULT_ABOUT).replace(/\s*\n+\s*/g, ' ')}`,
    '',
    '## Ringkasan angka',
    `- Total fokus tercatat: ${durationLabel(focusTotal)} dalam ${w.days.filter((d) => d.focusMin > 0).length} hari aktif`,
    `- Tugas selesai: ${w.tasksDone.length}`,
    `- Tugas lewat tenggat yang masih terbuka: ${w.overdue.length}`,
  )
  const moods = w.days.filter((d) => d.mood).map((d) => d.mood!)
  if (moods.length) L.push(`- Rata-rata mood: ${(moods.reduce((a, b) => a + b, 0) / moods.length).toFixed(1)} / 5`)

  L.push('', '## Per kategori (rencana di jadwal vs fokus tercatat)')
  for (const id of allCats)
    L.push(`- ${catName(id)}: dijadwalkan ${durationLabel(w.plannedByCat[id] ?? 0)}, fokus ${durationLabel(w.focusByCat[id] ?? 0)}`)
  if (!allCats.size) L.push('- (belum ada data)')

  L.push('', '## Per hari')
  for (const d of w.days) {
    const bits = [`fokus ${durationLabel(d.focusMin)}`, `terjadwal ${durationLabel(d.plannedMin)}`, `${d.tasksDone} tugas selesai`]
    if (d.mood) bits.push(`mood ${d.mood}/5`)
    L.push(`- ${fmt(d.date, 'EEEE d MMM')}: ${bits.join(', ')}${d.note ? ` — catatan: "${d.note.replace(/\s+/g, ' ').slice(0, 200)}"` : ''}`)
  }

  L.push('', '## Tugas yang selesai')
  if (w.tasksDone.length) L.push(...w.tasksDone.slice(0, 30).map((t) => `- [${catName(t.categoryId)}] ${t.title}`))
  else L.push('- (tidak ada)')

  if (w.overdue.length) L.push('', '## Masih tertunda & lewat tenggat', ...w.overdue.slice(0, 15).map((t) => `- [${catName(t.categoryId)}] ${t.title} (tenggat ${fmt(t.due!, 'd MMM')})`))

  if (w.habits.length)
    L.push('', '## Kebiasaan', ...w.habits.map(({ habit, done, due }) => `- ${habit.emoji} ${habit.name}: ${done}/${due} hari`))

  L.push(
    '',
    '## Yang aku minta',
    'Jawab dalam bahasa Indonesia santai, ringkas (maks ~300 kata), dengan bagian:',
    '1. **Ringkasan jujur** minggu ini (2–3 kalimat).',
    '2. **3 hal yang berjalan baik.**',
    '3. **Pola & penghambat**: jam/hari produktif, selisih rencana vs realisasi, dan keseimbangan Skripsi–Freelance–Santai–Bareng Pasangan.',
    '4. **3 saran konkret untuk minggu depan**, termasuk target realistis jam fokus per kategori.',
    '5. **Satu pertanyaan refleksi** untuk aku jawab.',
  )
  return L.join('\n')
}
