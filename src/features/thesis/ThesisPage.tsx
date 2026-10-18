import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowDown, ArrowUp, BookOpen, CalendarHeart, Check, Flag, GraduationCap, Plus, Timer, Wand2 } from 'lucide-react'
import { BackHeader } from '@/components/BackHeader'
import { Button, Card, EmptyState, Field, IconButton, Sheet } from '@/components/ui'
import { db, uid } from '@/db/db'
import { useCategories } from '@/db/hooks'
import { setSetting, useSettings } from '@/db/settings'
import type { Guidance, Milestone } from '@/db/types'
import { durationLabel, fmt, todayKey } from '@/lib/date'
import { matchCategory } from '@/lib/plan/schema'
import { THESIS_TEMPLATE, countdown, focusPerMilestone, pace, progress } from '@/lib/thesis'
import { cn } from '@/lib/cn'
import { GuidanceSheet, MilestoneSheet } from './ThesisSheets'

export function ThesisPage() {
  const today = todayKey()
  const s = useSettings()
  const { list: categories } = useCategories()
  const thesisCat = matchCategory('Skripsi', categories)?.id ?? categories[0]?.id ?? 'skripsi'
  const data = useLiveQuery(async () => {
    const [milestones, guidance, tasks, sessions] = await Promise.all([
      db.milestones.orderBy('order').toArray(),
      db.guidance.orderBy('date').reverse().toArray(),
      db.tasks.toArray(),
      db.sessions.toArray(),
    ])
    return { milestones, guidance, tasks, sessions }
  }, [])
  const [ms, setMs] = useState<Milestone | 'new' | null>(null)
  const [gd, setGd] = useState<Guidance | 'new' | null>(null)
  const [defense, setDefense] = useState(false)

  if (!data) return <BackHeader title="Skripsi" />
  const { milestones, guidance, tasks, sessions } = data
  const prog = progress(milestones)
  const cd = countdown(s.defenseDate || undefined, today)
  const pc = pace(milestones, s.defenseDate || undefined, today)
  const perMs = focusPerMilestone(sessions, tasks)
  const thesisFocus = sessions.filter((x) => x.categoryId === thesisCat).reduce((a, x) => a + x.durationMin, 0)
  const weekAgo = Date.now() - 7 * 86_400_000
  const thesisWeek = sessions.filter((x) => x.categoryId === thesisCat && x.start >= weekAgo).reduce((a, x) => a + x.durationMin, 0)
  const taskTitle = new Map(tasks.map((t) => [t.id, t]))

  const toggle = (m: Milestone) => db.milestones.update(m.id, { done: !m.done, doneAt: m.done ? undefined : Date.now() })
  const move = async (i: number, dir: -1 | 1) => {
    const a = milestones[i]
    const b = milestones[i + dir]
    if (!a || !b) return
    await db.transaction('rw', db.milestones, async () => {
      await db.milestones.update(a.id, { order: b.order })
      await db.milestones.update(b.id, { order: a.order })
    })
  }
  const applyTemplate = () => db.milestones.bulkAdd(THESIS_TEMPLATE.map((title, i) => ({ id: uid(), title, done: false, order: i })))

  const R = 46
  const C = 2 * Math.PI * R

  return (
    <div className="animate-rise space-y-4">
      <BackHeader title="Skripsi" sub="Progres, bimbingan, dan hitung mundur sidang" />

      <Card className="flex items-center gap-4">
        <div className="relative size-[112px] shrink-0">
          <svg viewBox="0 0 112 112" className="size-full -rotate-90" aria-hidden>
            <circle cx="56" cy="56" r={R} fill="none" stroke="var(--line)" strokeWidth="10" />
            <circle
              cx="56"
              cy="56"
              r={R}
              fill="none"
              stroke="url(#thesis-g)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${(prog.pct / 100) * C} ${C}`}
              className="transition-[stroke-dasharray] duration-700"
            />
            <defs>
              <linearGradient id="thesis-g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="var(--accent)" />
                <stop offset="1" stopColor="var(--accent-2)" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <div className="font-display text-2xl font-semibold tabular-nums">{prog.pct}%</div>
              <div className="text-[11px] text-muted">
                {prog.done}/{prog.total} milestone
              </div>
            </div>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <button type="button" onClick={() => setDefense(true)} className="flex min-h-11 w-full items-center gap-2 rounded-xl text-left hover:bg-white/5">
            <CalendarHeart className="size-5 shrink-0 text-accent" aria-hidden />
            <span>
              <span className="block text-xs text-muted">Target sidang</span>
              <span className="block font-semibold">{cd ? cd.label : 'Atur tanggal'}</span>
            </span>
          </button>
          {pc && (
            <p className="text-xs text-muted">
              Butuh ±<b className="text-ink">{pc.perWeek}</b> milestone/minggu untuk {pc.left} sisanya.
            </p>
          )}
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <Timer className="size-3.5" aria-hidden /> {durationLabel(thesisWeek)} minggu ini · {durationLabel(thesisFocus)} total
          </p>
        </div>
      </Card>

      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">Milestone</h2>
          <Button size="sm" variant="ghost" icon={Plus} onClick={() => setMs('new')}>
            Tambah
          </Button>
        </div>
        {milestones.length === 0 ? (
          <Card>
            <EmptyState
              icon={GraduationCap}
              title="Belum ada milestone"
              body="Pecah skripsi jadi tahap-tahap, lalu tautkan tugas ke tiap tahap."
              action={
                <Button variant="primary" icon={Wand2} onClick={applyTemplate}>
                  Pakai template skripsi
                </Button>
              }
            />
          </Card>
        ) : (
          <ul className="glass divide-y divide-line rounded-3xl">
            {milestones.map((m, i) => {
              const linked = tasks.filter((t) => t.milestoneId === m.id)
              const late = !m.done && m.due && m.due < today
              return (
                <li key={m.id} className="flex items-center gap-1 py-1 pl-1 pr-1">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={m.done}
                    aria-label={`${m.title} selesai`}
                    onClick={() => toggle(m)}
                    className="grid size-11 shrink-0 place-items-center"
                  >
                    <span className={cn('grid size-6 place-items-center rounded-lg border-2 transition', m.done ? 'border-accent-3 bg-accent-3' : 'border-faint')}>
                      {m.done && <Check className="size-4 text-bg" strokeWidth={3} aria-hidden />}
                    </span>
                  </button>
                  <button type="button" onClick={() => setMs(m)} className="min-h-11 min-w-0 flex-1 py-1.5 text-left">
                    <span className={cn('block font-medium leading-snug', m.done && 'text-faint line-through')}>{m.title}</span>
                    <span className="flex flex-wrap gap-x-3 text-xs text-muted">
                      {m.due && <span className={late ? 'font-semibold text-danger' : ''}>{fmt(m.due, 'd MMM')}</span>}
                      {linked.length > 0 && (
                        <span>
                          {linked.filter((t) => t.done).length}/{linked.length} tugas
                        </span>
                      )}
                      {perMs.get(m.id) ? <span>{durationLabel(perMs.get(m.id)!)} fokus</span> : null}
                    </span>
                  </button>
                  <IconButton icon={ArrowUp} label={`Naikkan ${m.title}`} disabled={i === 0} onClick={() => move(i, -1)} className="disabled:opacity-20" />
                  <IconButton icon={ArrowDown} label={`Turunkan ${m.title}`} disabled={i === milestones.length - 1} onClick={() => move(i, 1)} className="disabled:opacity-20" />
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">Log bimbingan</h2>
          <Button size="sm" variant="ghost" icon={Plus} onClick={() => setGd('new')}>
            Catat
          </Button>
        </div>
        {guidance.length === 0 ? (
          <Card className="flex items-center gap-3 text-sm text-muted">
            <BookOpen className="size-5 shrink-0 text-accent-2" aria-hidden />
            Setelah bimbingan, catat masukan dosen di sini. Poin revisi langsung jadi tugas.
          </Card>
        ) : (
          <ul className="space-y-2">
            {guidance.map((g) => {
              const done = g.revisions.filter((r) => r.taskId && taskTitle.get(r.taskId)?.done).length
              return (
                <li key={g.id}>
                  <button type="button" onClick={() => setGd(g)} className="glass block w-full rounded-3xl p-4 text-left hover:bg-white/5">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold">{fmt(g.date, 'EEEE, d MMM')}</span>
                      {g.lecturer && <span className="text-xs text-muted">{g.lecturer}</span>}
                    </span>
                    {g.notes && <span className="mt-1 line-clamp-2 block text-sm text-muted">{g.notes}</span>}
                    {g.revisions.length > 0 && (
                      <span className="mt-2 flex items-center gap-2 text-xs">
                        <Flag className="size-3.5 text-accent" aria-hidden />
                        {done}/{g.revisions.length} revisi beres
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/8">
                          <span className="block h-full rounded-full bg-accent-3" style={{ width: `${(done / g.revisions.length) * 100}%` }} />
                        </span>
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {ms && (
        <MilestoneSheet
          key={ms === 'new' ? 'new' : ms.id}
          milestone={ms === 'new' ? undefined : ms}
          nextOrder={Math.max(-1, ...milestones.map((m) => m.order)) + 1}
          thesisCat={thesisCat}
          onClose={() => setMs(null)}
        />
      )}
      {gd && (
        <GuidanceSheet
          key={gd === 'new' ? 'new' : gd.id}
          entry={gd === 'new' ? undefined : gd}
          milestones={milestones.filter((m) => !m.done)}
          thesisCat={thesisCat}
          lastLecturer={guidance[0]?.lecturer}
          onClose={() => setGd(null)}
        />
      )}
      {defense && (
        <Sheet open onClose={() => setDefense(false)} title="Target sidang">
          <Field label="Tanggal sidang (perkiraan juga boleh)">
            <input type="date" className="field" defaultValue={s.defenseDate} onChange={(e) => setSetting('defenseDate', e.target.value)} />
          </Field>
          <Button className="mt-4 w-full" variant="primary" onClick={() => setDefense(false)}>
            Selesai
          </Button>
        </Sheet>
      )}
    </div>
  )
}
