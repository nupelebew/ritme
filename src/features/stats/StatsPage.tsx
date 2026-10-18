import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { BarChart3 } from 'lucide-react'
import { BackHeader } from '@/components/BackHeader'
import { Card, Chip, EmptyState } from '@/components/ui'
import { db } from '@/db/db'
import { FALLBACK_CATEGORY, useCategories } from '@/db/hooks'
import type { DateKey } from '@/db/types'
import { durationLabel, shiftKey, toKey, todayKey } from '@/lib/date'
import { longestStreak } from '@/lib/habits'
import { dayStreaks, focusByCategory, focusByDate, heatmapColumns, trend } from '@/lib/stats'
import { cn } from '@/lib/cn'
import { BackupCard } from '@/features/settings/BackupCard'
import { Heatmap, TrendBars } from './charts'

type Range = '7' | '30' | 'all'

export function StatsPage() {
  const today = todayKey()
  const { map } = useCategories()
  const sessions = useLiveQuery(() => db.sessions.toArray(), [])
  const tasks = useLiveQuery(() => db.tasks.toArray(), [])
  const habits = useLiveQuery(() => db.habits.toArray(), [])
  const logs = useLiveQuery(() => db.habitLogs.toArray(), [])
  const [kind, setKind] = useState<'week' | 'month'>('week')
  const [range, setRange] = useState<Range>('30')
  const [table, setTable] = useState(false)

  const s = useMemo(() => {
    if (!sessions || !tasks || !habits || !logs) return null
    const since = (n: number): DateKey => shiftKey(today, -(n - 1))
    const inRange = (d: DateKey, r: Range) => r === 'all' || d >= since(Number(r))
    const byDate = focusByDate(sessions)
    const last30 = sessions.filter((x) => inRange(x.date, '30'))
    const focus30 = last30.reduce((a, x) => a + x.durationMin, 0)
    const activeDays30 = new Set(last30.map((x) => x.date)).size
    const done30 = tasks.filter((t) => t.done && t.doneAt && toKey(new Date(t.doneAt)) >= since(30)).length

    const activeDays = new Set<DateKey>([...byDate.keys(), ...tasks.filter((t) => t.doneAt).map((t) => toKey(new Date(t.doneAt!)))])
    const streak = dayStreaks(activeDays, today)

    let bestHabit = { name: '', n: 0 }
    for (const h of habits) {
      const set = new Set(logs.filter((l) => l.habitId === h.id).map((l) => l.date))
      const n = longestStreak(h, set, today)
      if (n > bestHabit.n) bestHabit = { name: `${h.emoji} ${h.name}`, n }
    }

    return {
      byDate,
      focus30,
      avg: activeDays30 ? focus30 / activeDays30 : 0,
      done30,
      streak,
      bestHabit,
      trend: trend(kind, kind === 'week' ? 12 : 6, today, sessions, tasks),
      cats: focusByCategory(sessions.filter((x) => inRange(x.date, range))),
      empty: sessions.length === 0 && !tasks.some((t) => t.done),
    }
  }, [sessions, tasks, habits, logs, today, kind, range])

  const columns = useMemo(() => heatmapColumns(today, 20), [today])

  if (!s) return <BackHeader title="Statistik" />

  const tiles = [
    { label: 'Fokus 30 hari', value: durationLabel(s.focus30), sub: s.avg ? `≈ ${durationLabel(Math.round(s.avg))} per hari aktif` : 'belum ada sesi' },
    { label: 'Tugas selesai', value: String(s.done30), sub: '30 hari terakhir' },
    { label: 'Hari aktif beruntun', value: `${s.streak.current} hari`, sub: `terpanjang ${s.streak.longest} hari` },
    { label: 'Streak kebiasaan terbaik', value: `${s.bestHabit.n} hari`, sub: s.bestHabit.name || 'belum ada kebiasaan' },
  ]
  const catTotal = s.cats.reduce((a, [, m]) => a + m, 0)

  return (
    <div className="animate-rise space-y-4">
      <BackHeader title="Statistik" sub="Track record-mu, dari data di perangkat ini" />

      {s.empty && (
        <EmptyState icon={BarChart3} title="Datanya masih sedikit" body="Selesaikan tugas dan jalankan sesi fokus; grafik di sini akan terisi sendiri." />
      )}

      <div className="grid grid-cols-2 gap-3">
        {tiles.map((t) => (
          <Card key={t.label} className="p-3.5">
            <p className="text-xs text-muted">{t.label}</p>
            <p className="font-display text-2xl font-semibold tabular-nums">{t.value}</p>
            <p className="truncate text-[11px] text-faint">{t.sub}</p>
          </Card>
        ))}
      </div>

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display font-semibold">Jam fokus</h2>
          <div role="tablist" aria-label="Periode tren" className="flex rounded-xl bg-white/5 p-0.5">
            {(['week', 'month'] as const).map((k) => (
              <button
                key={k}
                role="tab"
                type="button"
                aria-selected={kind === k}
                onClick={() => setKind(k)}
                className={cn('min-h-9 rounded-lg px-3 text-xs', kind === k ? 'bg-white/12 font-semibold' : 'text-muted')}
              >
                {k === 'week' ? 'Mingguan' : 'Bulanan'}
              </button>
            ))}
          </div>
        </div>
        <TrendBars data={s.trend} />
        <button type="button" className="min-h-11 text-[13px] text-accent-2" onClick={() => setTable(!table)} aria-expanded={table}>
          {table ? 'Sembunyikan tabel' : 'Lihat sebagai tabel'}
        </button>
        {table && (
          <table className="w-full text-[13px]">
            <thead className="text-left text-xs text-faint">
              <tr>
                <th className="py-1 font-medium">{kind === 'week' ? 'Minggu mulai' : 'Bulan'}</th>
                <th className="py-1 text-right font-medium">Fokus</th>
                <th className="py-1 text-right font-medium">Tugas selesai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[...s.trend].reverse().map((b) => (
                <tr key={b.key}>
                  <td className="py-1.5">{b.label}</td>
                  <td className="py-1.5 text-right tabular-nums">{durationLabel(b.focusMin)}</td>
                  <td className="py-1.5 text-right tabular-nums">{b.tasksDone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="font-display font-semibold">Kalender fokus · 20 minggu</h2>
        <Heatmap columns={columns} values={s.byDate} today={today} />
      </Card>

      <Card className="space-y-3">
        <div className="space-y-2">
          <h2 className="font-display font-semibold">Fokus per kategori</h2>
          <div className="flex gap-1.5">
            {(['7', '30', 'all'] as Range[]).map((r) => (
              <Chip key={r} active={range === r} onClick={() => setRange(r)} className="min-h-9 px-2.5 text-xs">
                {r === 'all' ? 'Semua' : `${r} hari`}
              </Chip>
            ))}
          </div>
        </div>
        {s.cats.length === 0 ? (
          <p className="text-sm text-muted">Belum ada sesi fokus di rentang ini.</p>
        ) : (
          <>
            <div className="flex h-3 gap-[2px] overflow-hidden rounded-full" role="img" aria-label="Proporsi fokus per kategori">
              {s.cats.map(([id, m]) => (
                <span key={id} style={{ width: `${(m / catTotal) * 100}%`, background: (map.get(id) ?? FALLBACK_CATEGORY).color }} />
              ))}
            </div>
            <ul className="space-y-1.5">
              {s.cats.map(([id, m]) => {
                const c = map.get(id) ?? FALLBACK_CATEGORY
                return (
                  <li key={id} className="flex items-center gap-2 text-[13px]">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: c.color }} aria-hidden />
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="tabular-nums text-muted">{Math.round((m / catTotal) * 100)}%</span>
                    <span className="w-20 text-right font-medium tabular-nums">{durationLabel(m)}</span>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </Card>

      <BackupCard />
    </div>
  )
}
