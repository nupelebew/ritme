import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { addMonths, endOfMonth, startOfMonth } from 'date-fns'
import { CheckCircle2, ChevronLeft, ChevronRight, Timer } from 'lucide-react'
import { BackHeader } from '@/components/BackHeader'
import { Card, Field, IconButton } from '@/components/ui'
import { db } from '@/db/db'
import { eventsForDate } from '@/db/events'
import type { DateKey, DayEntry } from '@/db/types'
import { durationLabel, fmt, fromKey, shiftKey, toKey, todayKey } from '@/lib/date'
import { isDue } from '@/lib/habits'
import { levelOf } from '@/lib/stats'
import { cn } from '@/lib/cn'
import { levelColor } from './charts'

export const MOODS = [
  { v: 1, e: '😞', l: 'Berat' },
  { v: 2, e: '🙁', l: 'Kurang' },
  { v: 3, e: '😐', l: 'Biasa' },
  { v: 4, e: '🙂', l: 'Baik' },
  { v: 5, e: '😄', l: 'Mantap' },
] as const

export function HistoryPage() {
  const today = todayKey()
  const [params, setParams] = useSearchParams()
  const date: DateKey = params.get('d') ?? today
  const setDate = (d: DateKey) => setParams(d === today ? {} : { d }, { replace: true })

  const monthStart = toKey(startOfMonth(fromKey(date)))
  const monthEnd = toKey(endOfMonth(fromKey(date)))
  const month = useLiveQuery(async () => {
    const [days, sessions] = await Promise.all([
      db.days.where('date').between(monthStart, monthEnd, true, true).toArray(),
      db.sessions.where('date').between(monthStart, monthEnd, true, true).toArray(),
    ])
    const focus = new Map<DateKey, number>()
    for (const s of sessions) focus.set(s.date, (focus.get(s.date) ?? 0) + s.durationMin)
    return { days: new Map(days.map((d) => [d.date, d])), focus }
  }, [monthStart, monthEnd])

  const lead = (fromKey(monthStart).getDay() + 6) % 7
  const count = Number(monthEnd.slice(8))
  const dates = Array.from({ length: count }, (_, i) => shiftKey(monthStart, i))

  return (
    <div className="animate-rise space-y-4">
      <BackHeader title="Riwayat & mood" sub="Ketuk tanggal untuk melihat atau mencatat" />

      <Card className="space-y-2 p-3">
        <div className="flex items-center justify-between">
          <IconButton icon={ChevronLeft} label="Bulan sebelumnya" onClick={() => setDate(toKey(addMonths(fromKey(monthStart), -1)))} />
          <h2 className="font-display font-semibold capitalize">{fmt(monthStart, 'MMMM yyyy')}</h2>
          <IconButton
            icon={ChevronRight}
            label="Bulan berikutnya"
            disabled={monthEnd >= today}
            className="disabled:opacity-25"
            onClick={() => {
              const next = toKey(addMonths(fromKey(monthStart), 1))
              setDate(next > today ? today : next)
            }}
          />
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((d) => (
            <span key={d} className="pb-1 text-[11px] font-medium text-faint" aria-hidden>
              {d}
            </span>
          ))}
          {Array.from({ length: lead }, (_, i) => (
            <span key={`p${i}`} />
          ))}
          {dates.map((d) => {
            const entry = month?.days.get(d)
            const mood = MOODS.find((m) => m.v === entry?.mood)
            const focus = month?.focus.get(d) ?? 0
            const future = d > today
            return (
              <button
                key={d}
                type="button"
                disabled={future}
                aria-current={d === date ? 'date' : undefined}
                aria-label={`${fmt(d, 'EEEE d MMMM')}${mood ? `, mood ${mood.l}` : ''}${focus ? `, fokus ${durationLabel(focus)}` : ''}${entry?.note ? ', ada catatan' : ''}`}
                onClick={() => setDate(d)}
                className={cn(
                  'relative flex min-h-12 flex-col items-center justify-center overflow-hidden rounded-xl text-sm tabular-nums transition disabled:opacity-25',
                  d === date ? 'bg-white/14 font-bold ring-2 ring-accent' : 'hover:bg-white/6',
                  d === today && d !== date && 'text-accent-2',
                )}
              >
                <span className="leading-none">{Number(d.slice(8))}</span>
                <span className="mt-0.5 h-3.5 text-[12px] leading-none">{mood?.e ?? (entry?.note ? '·' : '')}</span>
                {focus > 0 && <span className="absolute inset-x-1.5 bottom-1 h-1 rounded-full" style={{ background: levelColor(levelOf(focus)) }} aria-hidden />}
              </button>
            )
          })}
        </div>
      </Card>

      <DayDetail key={date} date={date} />
    </div>
  )
}

function DayDetail({ date }: { date: DateKey }) {
  const entry = useLiveQuery(async () => (await db.days.get(date)) ?? ({ date } as DayEntry), [date])
  const info = useLiveQuery(async () => {
    const start = fromKey(date).getTime()
    const [sessions, tasks, occ, habits, logs] = await Promise.all([
      db.sessions.where('date').equals(date).toArray(),
      db.tasks.filter((t) => !!t.doneAt && t.doneAt >= start && t.doneAt < start + 86_400_000).toArray(),
      eventsForDate(db, date),
      db.habits.filter((h) => !h.archived).toArray(),
      db.habitLogs.where('date').equals(date).toArray(),
    ])
    const due = habits.filter((h) => isDue(h, date))
    return {
      focus: sessions.reduce((a, s) => a + s.durationMin, 0),
      sessions: sessions.length,
      tasks,
      events: occ.length,
      habitsDone: logs.filter((l) => due.some((h) => h.id === l.habitId)).length,
      habitsDue: due.length,
    }
  }, [date])

  const [note, setNote] = useState<string | null>(null)
  useEffect(() => {
    if (note === null) return
    const id = setTimeout(() => save({ note: note || undefined }), 500)
    return () => clearTimeout(id)
    // `save` hanya bergantung pada `date`, dan komponen ini di-remount (key) saat tanggal berganti
  }, [note])

  const save = (patch: Partial<DayEntry>) =>
    db.transaction('rw', db.days, async () => {
      const cur = await db.days.get(date)
      await db.days.put({ ...(cur ?? { date }), ...patch })
    })

  return (
    <Card className="space-y-4">
      <h2 className="font-display text-lg font-semibold">{fmt(date, 'EEEE, d MMMM yyyy')}</h2>

      <div role="radiogroup" aria-label="Mood hari ini" className="grid grid-cols-5 gap-1.5">
        {MOODS.map((m) => {
          const on = entry?.mood === m.v
          return (
            <button
              key={m.v}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => save({ mood: on ? undefined : m.v })}
              className={cn(
                'flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-2xl border transition active:scale-95',
                on ? 'border-accent bg-accent/15' : 'border-line hover:bg-white/5',
              )}
            >
              <span className={cn('text-2xl transition', !on && entry?.mood && 'opacity-40 grayscale')}>{m.e}</span>
              <span className={cn('text-[11px]', on ? 'font-semibold text-ink' : 'text-muted')}>{m.l}</span>
            </button>
          )
        })}
      </div>

      <Field label="Catatan hari ini">
        <textarea
          className="field min-h-28 resize-y leading-relaxed"
          value={note ?? entry?.note ?? ''}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => note !== null && save({ note: note || undefined })}
          placeholder="Apa yang berjalan baik? Apa yang bikin capek? Ada momen kecil yang pengin diingat?"
        />
      </Field>

      {info && (
        <div className="grid grid-cols-2 gap-2 text-[13px]">
          <Stat label="Fokus" value={`${durationLabel(info.focus)}`} sub={`${info.sessions} sesi`} />
          <Stat label="Tugas selesai" value={String(info.tasks.length)} />
          <Stat label="Kegiatan terjadwal" value={String(info.events)} />
          <Stat label="Kebiasaan" value={info.habitsDue ? `${info.habitsDone}/${info.habitsDue}` : '–'} />
        </div>
      )}
      {info && info.tasks.length > 0 && (
        <ul className="space-y-1 text-sm">
          {info.tasks.map((t) => (
            <li key={t.id} className="flex items-center gap-2 text-muted">
              <CheckCircle2 className="size-4 shrink-0 text-accent-3" aria-hidden />
              <span className="truncate">{t.title}</span>
            </li>
          ))}
        </ul>
      )}
      {(entry?.energy || entry?.reflection) && (
        <div className="space-y-1 rounded-2xl border border-line p-3 text-sm">
          {entry?.energy && <p className="text-muted">Energi pagi: <b className="text-ink">{entry.energy}/5</b></p>}
          {entry?.reflection?.good && <p><span className="text-muted">Berjalan baik:</span> {entry.reflection.good}</p>}
          {entry?.reflection?.block && <p><span className="text-muted">Hambatan:</span> {entry.reflection.block}</p>}
          {entry?.reflection?.tomorrow && <p><span className="text-muted">Fokus besok:</span> {entry.reflection.tomorrow}</p>}
        </div>
      )}
      {entry?.brainDump && (
        <details>
          <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-[13px] text-muted">
            <Timer className="size-4" aria-hidden /> Brain dump hari itu
          </summary>
          <p className="whitespace-pre-wrap rounded-xl bg-white/5 p-3 text-sm text-muted">{entry.brainDump}</p>
        </details>
      )}
    </Card>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-line px-3 py-2">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="font-display text-lg font-semibold tabular-nums">
        {value}
        {sub && <span className="ml-1.5 text-[11px] font-normal text-faint">{sub}</span>}
      </p>
    </div>
  )
}
