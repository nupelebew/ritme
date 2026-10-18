import { useDeferredValue, useState } from 'react'
import { useNavigate } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { BookOpen, CalendarClock, CheckCircle2, Circle, Flag, Flame, NotebookPen, Search, type LucideIcon } from 'lucide-react'
import { BackHeader } from '@/components/BackHeader'
import { EmptyState } from '@/components/ui'
import { db } from '@/db/db'
import { fmt } from '@/lib/date'
import { searchAll, type Hit, type HitKind } from '@/lib/search'

const KIND: Record<HitKind, { label: string; icon: LucideIcon }> = {
  task: { label: 'Tugas', icon: Circle },
  event: { label: 'Kegiatan', icon: CalendarClock },
  day: { label: 'Catatan harian', icon: NotebookPen },
  habit: { label: 'Kebiasaan', icon: Flame },
  milestone: { label: 'Milestone skripsi', icon: Flag },
  guidance: { label: 'Bimbingan', icon: BookOpen },
}

export function SearchPage() {
  const [q, setQ] = useState('')
  const dq = useDeferredValue(q)
  const navigate = useNavigate()
  const data = useLiveQuery(async () => {
    const [tasks, events, days, habits, milestones, guidance] = await Promise.all([
      db.tasks.toArray(),
      db.events.toArray(),
      db.days.toArray(),
      db.habits.filter((h) => !h.archived).toArray(),
      db.milestones.toArray(),
      db.guidance.toArray(),
    ])
    return { tasks, events, days, habits, milestones, guidance }
  }, [])
  const hits = data ? searchAll(dq, data) : []

  const open = (h: Hit) => {
    if (h.kind === 'task') navigate(`/tugas?buka=${h.id}`)
    else if (h.kind === 'event') navigate(`/?d=${h.date}`)
    else if (h.kind === 'day') navigate(`/riwayat?d=${h.date}`)
    else if (h.kind === 'habit') navigate('/kebiasaan')
    else navigate('/skripsi')
  }

  const groups = (Object.keys(KIND) as HitKind[]).map((k) => ({ k, items: hits.filter((h) => h.kind === k) })).filter((g) => g.items.length)

  return (
    <div className="animate-rise space-y-4">
      <BackHeader title="Cari" />
      <label className="glass flex items-center gap-2 rounded-2xl px-3 focus-within:border-accent">
        <Search className="size-5 text-muted" aria-hidden />
        <input
          autoFocus
          type="search"
          className="min-h-12 flex-1 bg-transparent outline-none placeholder:text-faint"
          placeholder="Cari tugas, kegiatan, catatan…"
          aria-label="Kata kunci pencarian"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          enterKeyHint="search"
        />
      </label>

      {q.trim().length >= 2 && groups.length === 0 && <EmptyState icon={Search} title="Tidak ketemu" body="Coba kata lain, atau lebih pendek." />}
      {q.trim().length < 2 && <p className="px-1 text-sm text-faint">Ketik minimal 2 huruf. Pencarian berjalan di perangkat, tanpa internet.</p>}

      {groups.map(({ k, items }) => {
        const { label, icon: Icon } = KIND[k]
        return (
          <section key={k}>
            <h2 className="mb-1 px-1 text-xs font-semibold uppercase tracking-[0.14em] text-faint">
              {label} · {items.length}
            </h2>
            <ul className="glass divide-y divide-line rounded-3xl">
              {items.map((h) => (
                <li key={h.kind + h.id}>
                  <button type="button" onClick={() => open(h)} className="flex min-h-14 w-full items-start gap-3 px-4 py-3 text-left hover:bg-white/5">
                    {h.done ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent-3" aria-hidden /> : <Icon className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />}
                    <span className="min-w-0 flex-1">
                      <span className={h.done ? 'block text-faint line-through' : 'block font-medium'}>{h.kind === 'day' ? fmt(h.title, 'EEEE, d MMMM yyyy') : h.title}</span>
                      {(h.snippet || (h.date && h.kind !== 'day')) && (
                        <span className="block truncate text-xs text-muted">
                          {h.date && h.kind !== 'day' ? fmt(h.date, 'd MMM yyyy') : ''}
                          {h.date && h.kind !== 'day' && h.snippet ? ' · ' : ''}
                          {h.snippet}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
