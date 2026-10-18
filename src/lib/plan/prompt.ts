import type { Category, DateKey, Habit } from '@/db/types'
import { durationLabel, fmt, minToHHMM, shiftKey } from '@/lib/date'
import { PRIORITY, dueLabel, type Scored } from '@/lib/priority'
import { recurrenceLabel, type Occurrence } from '@/lib/schedule'

export interface PlanPromptInput {
  date: DateKey
  today: DateKey
  name?: string
  categories: Category[]
  fixed: Occurrence[]
  routines?: string
  ranked: Scored[]
  habits: Habit[]
  brainDump?: string
  dayStartHour: number
  dayEndHour: number
  focusMin: number
  avgFocusMin?: number
}

const EXAMPLE = `{
  "date": "YYYY-MM-DD",
  "blocks": [
    { "title": "Nulis bab 3 bagian metode", "start": "08:00", "end": "09:30", "category": "Skripsi", "taskId": "ID-TUGAS-ATAU-null" },
    { "title": "Jeda + sarapan", "start": "09:30", "end": "09:45", "category": "Santai" }
  ],
  "newTasks": [
    { "title": "Tugas baru dari brain dump", "category": "Rumah", "priority": 2, "due": "YYYY-MM-DD", "estimateMin": 30 }
  ],
  "top3": ["judul atau ID tugas terpenting"],
  "notes": "1-2 kalimat saran singkat"
}`

export function buildPlanPrompt(i: PlanPromptInput): string {
  const cats = i.categories.filter((c) => !c.archived)
  const catName = (id: string) => cats.find((c) => c.id === id)?.name ?? id
  const when = i.date === i.today ? 'hari ini' : i.date === shiftKey(i.today, 1) ? 'besok' : i.date === shiftKey(i.today, 2) ? 'lusa' : ''
  const hh = (h: number) => `${String(h).padStart(2, '0')}:00`
  const lines: string[] = []
  const push = (...s: string[]) => lines.push(...s)

  push(
    `Kamu asisten perencana harian yang realistis dan suportif. Tolong susun jadwal untuk ${when ? `${when}, ` : ''}${fmt(i.date, 'EEEE, d MMMM yyyy')}${i.name ? ` untuk ${i.name}` : ''}.`,
    '',
    '## Tentang saya',
    '- Mahasiswa tingkat akhir yang sedang mengerjakan skripsi.',
    '- Baru mulai freelance, jam kerjanya belum tetap.',
    '- Banyak beraktivitas di rumah; butuh waktu santai dan waktu bareng pasangan.',
    `- Jam aktif ${hh(i.dayStartHour)}–${hh(i.dayEndHour)}. Sesi fokus biasanya ${i.focusMin} menit.`,
  )
  if (i.avgFocusMin) push(`- Rata-rata fokus tercatat 7 hari terakhir: ${durationLabel(Math.round(i.avgFocusMin))}/hari.`)

  push('', '## Kategori (pakai persis salah satu nama ini)', ...cats.map((c) => `- ${c.name}`))

  push('', '## Jadwal tetap di tanggal itu (JANGAN diubah, jangan ditimpa)')
  if (i.fixed.length)
    push(
      ...i.fixed.map(
        (e) => `- ${minToHHMM(e.start)}–${minToHHMM(e.end)} ${e.title} [${catName(e.categoryId)}]${e.recurrence ? ` (${recurrenceLabel(e.recurrence).toLowerCase()})` : ''}`,
      ),
    )
  else push('- (belum ada)')

  push('', '## Rutinitas', i.routines?.trim() || '- (tidak ada catatan rutinitas)')

  push('', '## Tugas tertunda (urut skor prioritas lokal)')
  if (i.ranked.length)
    push(
      ...i.ranked.slice(0, 15).map(({ task: t }) => {
        const parts = [`[id: ${t.id}] ${t.title}`, catName(t.categoryId), `prioritas ${PRIORITY[t.priority].label.toLowerCase()}`]
        if (t.due) parts.push(`tenggat ${fmt(t.due, 'EEE d MMM')} (${dueLabel(t.due, i.today).toLowerCase()})`)
        if (t.estimateMin) parts.push(`estimasi ${durationLabel(t.estimateMin)}`)
        const left = t.subtasks.filter((s) => !s.done).map((s) => s.title)
        if (left.length) parts.push(`sisa subtugas: ${left.join('; ')}`)
        return `- ${parts.join(' | ')}`
      }),
    )
  else push('- (tidak ada)')

  if (i.habits.length) push('', '## Kebiasaan yang perlu disempatkan', ...i.habits.map((h) => `- ${h.emoji} ${h.name}`))

  push('', '## Brain dump (pikiran mentah, belum tentu tugas)', i.brainDump?.trim() || '- (kosong)')

  push(
    '',
    '## Aturan',
    '1. Hormati jadwal tetap. Blok tidak boleh bertumpuk satu sama lain maupun dengan jadwal tetap.',
    '2. Realistis: total kerja fokus (Skripsi + Freelance) idealnya 4–6 jam; sisipkan jeda 10–15 menit tiap 60–90 menit, plus waktu makan.',
    '3. Dahulukan tenggat terdekat dan prioritas tinggi. Tugas besar dipecah jadi blok maksimal 2 jam.',
    '4. Sediakan minimal satu blok Santai dan satu blok Bareng Pasangan bila memungkinkan, terutama sore/malam.',
    '5. Item brain dump yang belum ada di daftar tugas: jadwalkan sebagai blok, atau masukkan ke "newTasks" bila tidak muat.',
    '6. Bila blok mengerjakan tugas dari daftar, isi "taskId" dengan id-nya; selain itu null.',
    '7. Jangan masukkan ulang jadwal tetap ke "blocks".',
    '',
    '## Format jawaban',
    'Balas HANYA dengan satu blok kode ```json``` berisi JSON valid (tanpa komentar, tanpa teks lain) dengan bentuk:',
    '```json',
    EXAMPLE,
    '```',
    `- "date" wajib "${i.date}".`,
    '- "start"/"end" format 24 jam "HH:MM", urut dari pagi ke malam.',
    '- "category" harus salah satu nama kategori di atas.',
    '- "newTasks", "top3", "notes" boleh dikosongkan.',
  )
  return lines.join('\n')
}
