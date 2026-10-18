import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { addMonths, endOfMonth, startOfMonth } from 'date-fns'
import { ChevronLeft, ChevronRight, Share2 } from 'lucide-react'
import { BackHeader } from '@/components/BackHeader'
import { Button, IconButton } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { db } from '@/db/db'
import { eventsForDate } from '@/db/events'
import { FALLBACK_CATEGORY, useCategories } from '@/db/hooks'
import { useSettings } from '@/db/settings'
import { durationLabel, fmt, fromKey, shiftKey, toKey, todayKey } from '@/lib/date'
import { matchCategory } from '@/lib/plan/schema'
import { renderWrappedImage, shareOrDownload } from '@/lib/shareImage'
import { computeWrapped, type Wrapped } from '@/lib/wrapped'

export function WrappedPage() {
  const today = todayKey()
  const s = useSettings()
  const toast = useToast()
  const { list, map } = useCategories()
  const couple = matchCategory('Pasangan', list)?.id
  // Awal bulan: tampilkan bulan lalu (bulan ini baru mulai)
  const [month, setMonth] = useState(() => toKey(startOfMonth(Number(today.slice(8)) <= 5 ? addMonths(fromKey(today), -1) : fromKey(today))))
  const w = useLiveQuery(async (): Promise<Wrapped> => {
    const from = month
    const to = toKey(endOfMonth(fromKey(month)))
    const days: string[] = []
    for (let d = from; d <= to && d <= today; d = shiftKey(d, 1)) days.push(d)
    const [sessions, tasks, dayRows, logs, occ] = await Promise.all([
      db.sessions.where('date').between(from, to, true, true).toArray(),
      db.tasks.filter((t) => t.done).toArray(),
      db.days.where('date').between(from, to, true, true).toArray(),
      db.habitLogs.where('date').between(from, to, true, true).count(),
      Promise.all(days.map((d) => eventsForDate(db, d))),
    ])
    return computeWrapped({ month, sessions, tasks, days: dayRows, events: occ.flat(), coupleCategory: couple, habitChecks: logs, newBadges: 0 })
  }, [month, couple, today])

  if (!w) return <BackHeader title="Ritme Wrapped" />
  const top = w.topCategory ? map.get(w.topCategory.id) ?? FALLBACK_CATEGORY : undefined
  const hh = (h: number) => `${String(h).padStart(2, '0')}.00`
  const slides: { k: string; big: string; label: string; sub?: string; color?: string }[] = [
    { k: 'focus', big: durationLabel(w.focusMin), label: 'total fokus', sub: `di ${w.activeDays} hari aktif` },
    top ? { k: 'top', big: top.name, label: 'kategori teratas', sub: durationLabel(w.topCategory!.minutes), color: top.color } : null,
    w.bestDay ? { k: 'best', big: fmt(w.bestDay.date, 'EEEE, d MMM'), label: 'hari paling produktif', sub: durationLabel(w.bestDay.minutes) } : null,
    w.golden ? { k: 'gold', big: `${hh(w.golden[0])}–${hh(w.golden[1])}`, label: 'jam emasmu' } : null,
    { k: 'tasks', big: String(w.tasksDone), label: 'tugas selesai', sub: w.hardestTask ? `terberat: ${w.hardestTask}` : undefined },
    w.coupleMin ? { k: 'couple', big: durationLabel(w.coupleMin), label: 'waktu bareng pasangan 💞' } : null,
    w.habitChecks ? { k: 'habit', big: String(w.habitChecks), label: 'centang kebiasaan' } : null,
    w.moodAvg ? { k: 'mood', big: `${w.moodAvg.toLocaleString('id-ID')} / 5`, label: 'rata-rata mood' } : null,
  ].filter((x): x is NonNullable<typeof x> => !!x)

  const share = async () => {
    const blob = await renderWrappedImage(fmt(month, 'MMMM yyyy'), slides.slice(0, 6), s.name || undefined)
    const r = await shareOrDownload(new File([blob], `ritme-wrapped-${month.slice(0, 7)}.png`, { type: 'image/png' }))
    if (r === 'downloaded') toast({ text: 'Gambar Wrapped diunduh.', tone: 'success' })
  }

  return (
    <div className="animate-rise space-y-4">
      <BackHeader title="Ritme Wrapped" action={<Button size="sm" variant="primary" icon={Share2} onClick={share}>Bagikan</Button>} />
      <div className="flex items-center justify-between">
        <IconButton icon={ChevronLeft} label="Bulan sebelumnya" onClick={() => setMonth(toKey(addMonths(fromKey(month), -1)))} />
        <span className="font-display text-lg font-semibold capitalize">{fmt(month, 'MMMM yyyy')}</span>
        <IconButton icon={ChevronRight} label="Bulan berikutnya" disabled={toKey(endOfMonth(fromKey(month))) >= today} onClick={() => setMonth(toKey(addMonths(fromKey(month), 1)))} className="disabled:opacity-25" />
      </div>

      {w.focusMin === 0 && w.tasksDone === 0 ? (
        <p className="glass rounded-3xl p-6 text-center text-sm text-muted">Belum ada data di bulan ini. Rekapnya akan terisi seiring kamu memakai Ritme.</p>
      ) : (
        <ul className="space-y-3">
          {slides.map((x, i) => (
            <li
              key={x.k}
              className="relative overflow-hidden rounded-3xl border border-line p-6 animate-rise"
              style={{
                animationDelay: `${i * 80}ms`,
                background: `linear-gradient(135deg, color-mix(in srgb, ${x.color ?? 'var(--accent)'} 28%, transparent), color-mix(in srgb, var(--accent-2) 10%, transparent))`,
              }}
            >
              <p className="text-xs uppercase tracking-[0.16em] text-muted">{x.label}</p>
              <p className="mt-1 break-words font-display text-[clamp(30px,10vw,44px)] font-semibold leading-tight">{x.big}</p>
              {x.sub && <p className="mt-1 text-sm text-muted">{x.sub}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
