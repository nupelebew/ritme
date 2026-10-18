import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { startOfWeek } from 'date-fns'
import { ChevronLeft, ChevronRight, ClipboardCopy, ExternalLink } from 'lucide-react'
import { BackHeader } from '@/components/BackHeader'
import { Button, Card, Field, IconButton } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { db } from '@/db/db'
import { FALLBACK_CATEGORY, useCategories } from '@/db/hooks'
import { gatherWeek } from '@/db/review'
import { useSettings } from '@/db/settings'
import { copyText } from '@/lib/clipboard'
import { durationLabel, fmt, shiftKey, toKey, todayKey } from '@/lib/date'
import { buildReviewPrompt, sumValues } from '@/lib/plan/review'
import { cn } from '@/lib/cn'

export function ReviewPage() {
  const today = todayKey()
  const thisWeek = toKey(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [start, setStart] = useState(thisWeek)
  const { list: categories, map } = useCategories()
  const settings = useSettings()
  const toast = useToast()
  const week = useLiveQuery(() => gatherWeek(start, today), [start, today])

  const noteKey = `review-${start}`
  const saved = useLiveQuery(() => db.settings.get(noteKey), [noteKey])
  const [note, setNote] = useState<string | null>(null)
  useEffect(() => setNote(null), [noteKey])

  const copy = async () => {
    if (!week) return
    const ok = await copyText(buildReviewPrompt(week, categories, settings.name || undefined, settings.about))
    toast(ok ? { text: 'Prompt evaluasi tersalin. Tempel ke Claude.', tone: 'success' } : { text: 'Gagal menyalin.', tone: 'error' })
  }

  const focus = week ? sumValues(week.focusByCat) : 0
  const planned = week ? sumValues(week.plannedByCat) : 0
  const habitDue = week?.habits.reduce((a, h) => a + h.due, 0) ?? 0
  const habitDone = week?.habits.reduce((a, h) => a + h.done, 0) ?? 0
  const moods = week?.days.filter((d) => d.mood).map((d) => d.mood!) ?? []
  const maxDay = Math.max(60, ...(week?.days.map((d) => Math.max(d.focusMin, d.plannedMin)) ?? [0]))
  const cats = week ? [...new Set([...Object.keys(week.plannedByCat), ...Object.keys(week.focusByCat)])] : []
  const maxCat = Math.max(1, ...cats.map((c) => Math.max(week!.plannedByCat[c] ?? 0, week!.focusByCat[c] ?? 0)))

  const tiles = [
    { label: 'Jam fokus', value: durationLabel(focus), sub: `dari ${durationLabel(planned)} terjadwal` },
    { label: 'Tugas selesai', value: String(week?.tasksDone.length ?? 0), sub: `${week?.overdue.length ?? 0} lewat tenggat` },
    { label: 'Kebiasaan', value: habitDue ? `${Math.round((habitDone / habitDue) * 100)}%` : '–', sub: `${habitDone}/${habitDue} centang` },
    { label: 'Mood', value: moods.length ? (moods.reduce((a, b) => a + b, 0) / moods.length).toFixed(1) : '–', sub: moods.length ? `${moods.length} hari tercatat` : 'isi di Riwayat' },
  ]

  return (
    <div className="animate-rise space-y-4">
      <BackHeader title="Rekap mingguan" sub={`${fmt(start, 'd MMM')} – ${fmt(shiftKey(start, 6), 'd MMM yyyy')}`} />

      <div className="flex items-center justify-between">
        <IconButton icon={ChevronLeft} label="Minggu sebelumnya" onClick={() => setStart(shiftKey(start, -7))} />
        <span className="text-sm font-medium">{start === thisWeek ? 'Minggu ini' : start === shiftKey(thisWeek, -7) ? 'Minggu lalu' : fmt(start, "'Minggu' d MMM")}</span>
        <IconButton icon={ChevronRight} label="Minggu berikutnya" disabled={start >= thisWeek} onClick={() => setStart(shiftKey(start, 7))} className="disabled:opacity-25" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {tiles.map((t) => (
          <Card key={t.label} className="p-3.5">
            <p className="text-xs text-muted">{t.label}</p>
            <p className="font-display text-2xl font-semibold tabular-nums">{t.value}</p>
            <p className="text-[11px] text-faint">{t.sub}</p>
          </Card>
        ))}
      </div>

      <Card className="space-y-3">
        <h2 className="font-display font-semibold">Per hari</h2>
        <div className="flex h-36 items-end gap-2" role="img" aria-label="Grafik fokus dan jadwal per hari">
          {week?.days.map((d) => (
            <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <div className="relative flex w-full flex-1 items-end justify-center gap-0.5">
                <span className="w-2.5 rounded-t bg-white/12" style={{ height: `${(d.plannedMin / maxDay) * 100}%` }} title={`Terjadwal ${durationLabel(d.plannedMin)}`} />
                <span
                  className="w-2.5 rounded-t bg-[linear-gradient(to_top,var(--accent),var(--accent-2))]"
                  style={{ height: `${(d.focusMin / maxDay) * 100}%` }}
                  title={`Fokus ${durationLabel(d.focusMin)}`}
                />
              </div>
              <span className={cn('text-[11px]', d.date === today ? 'font-bold text-accent-2' : 'text-faint')}>{fmt(d.date, 'EEEEEE')}</span>
            </div>
          ))}
        </div>
        <p className="flex gap-4 text-[11px] text-muted">
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-white/25" />Terjadwal</span>
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-accent-2" />Fokus tercatat</span>
        </p>
      </Card>

      {cats.length > 0 && (
        <Card className="space-y-3">
          <h2 className="font-display font-semibold">Keseimbangan kategori</h2>
          <ul className="space-y-2.5">
            {cats.map((id) => {
              const c = map.get(id) ?? FALLBACK_CATEGORY
              const p = week!.plannedByCat[id] ?? 0
              const f = week!.focusByCat[id] ?? 0
              return (
                <li key={id}>
                  <div className="mb-1 flex justify-between text-[13px]">
                    <span className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: c.color }} />{c.name}</span>
                    <span className="tabular-nums text-muted">{durationLabel(f)} / {durationLabel(p)}</span>
                  </div>
                  <div className="relative h-2 rounded-full bg-white/6">
                    <span className="absolute inset-y-0 left-0 rounded-full opacity-30" style={{ width: `${(p / maxCat) * 100}%`, background: c.color }} />
                    <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(f / maxCat) * 100}%`, background: c.color }} />
                  </div>
                </li>
              )
            })}
          </ul>
          <p className="text-[11px] text-faint">Batang pudar = terjadwal, batang penuh = fokus tercatat.</p>
        </Card>
      )}

      <Card className="space-y-3">
        <h2 className="font-display font-semibold">Evaluasi bareng Claude</h2>
        <p className="text-[13px] text-muted">Prompt berisi angka minggu ini, tugas selesai, kebiasaan, mood & catatan harian. Tidak ada data yang dikirim otomatis.</p>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Button variant="primary" icon={ClipboardCopy} onClick={copy} disabled={!week}>
            Buat prompt evaluasi
          </Button>
          <a href="https://claude.ai/new" target="_blank" rel="noreferrer" className="glass inline-flex min-h-11 items-center gap-1.5 rounded-2xl px-3 text-sm hover:bg-white/10">
            Buka Claude <ExternalLink className="size-4" aria-hidden />
          </a>
        </div>
        <Field label="Catatan evaluasi (opsional)" hint="Tempel ringkasan dari Claude atau tulis refleksimu sendiri. Tersimpan untuk minggu ini.">
          <textarea
            className="field min-h-28 resize-y text-sm"
            value={note ?? ((saved?.value as string) || '')}
            onChange={(e) => setNote(e.target.value)}
            onBlur={(e) => db.settings.put({ key: noteKey, value: e.target.value })}
          />
        </Field>
      </Card>
    </div>
  )
}
