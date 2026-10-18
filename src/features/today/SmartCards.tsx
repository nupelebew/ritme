import { useState } from 'react'
import { Link } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { BedDouble, ChevronRight, Target } from 'lucide-react'
import { Card } from '@/components/ui'
import { db } from '@/db/db'
import { FALLBACK_CATEGORY, useCategories } from '@/db/hooks'
import { loadWeekProgress } from '@/db/insights'
import { useSettings } from '@/db/settings'
import type { DayEntry } from '@/db/types'
import { durationLabel, minToHHMM, nowMinutes, todayKey } from '@/lib/date'
import { useNow } from '@/lib/useNow'
import { cn } from '@/lib/cn'

export const ENERGY = [
  { v: 1, e: '🪫', l: 'Lowbat' },
  { v: 2, e: '😮‍💨', l: 'Lemas' },
  { v: 3, e: '🙂', l: 'Cukup' },
  { v: 4, e: '💪', l: 'Segar' },
  { v: 5, e: '⚡', l: 'Full' },
] as const

/** Check-in energi pagi: muncul sampai jam 14 kalau belum diisi */
export function EnergyCheck() {
  const today = todayKey()
  const now = useNow(60_000)
  const entry = useLiveQuery(() => db.days.get(today), [today])
  const [hidden, setHidden] = useState(false)
  if (hidden || entry?.energy || now.getHours() >= 14) return null

  const save = async (v: DayEntry['energy']) => {
    await db.transaction('rw', db.days, async () => {
      const cur = await db.days.get(today)
      await db.days.put({ ...(cur ?? { date: today }), energy: v })
    })
    setHidden(true)
  }

  return (
    <Card className="space-y-2 p-3.5">
      <p className="text-sm font-semibold">Energi pagi ini?</p>
      <div role="radiogroup" aria-label="Energi pagi ini" className="grid grid-cols-5 gap-1.5">
        {ENERGY.map((x) => (
          <button
            key={x.v}
            type="button"
            role="radio"
            aria-checked={false}
            onClick={() => save(x.v)}
            className="flex min-h-14 flex-col items-center justify-center rounded-2xl border border-line transition hover:bg-white/5 active:scale-95"
          >
            <span className="text-xl" aria-hidden>
              {x.e}
            </span>
            <span className="text-[11px] text-muted">{x.l}</span>
          </button>
        ))}
      </div>
      <p className="text-[11px] text-faint">Dipakai penyusun jadwal: energi rendah → beban lebih ringan & jeda lebih banyak.</p>
    </Card>
  )
}

/** Progres target mingguan per kategori */
export function WeekTargets() {
  const s = useSettings()
  const { map } = useCategories()
  const now = useNow(60_000)
  const today = todayKey()
  const nowMin = nowMinutes(now)
  const rows = useLiveQuery(() => loadWeekProgress(db, s.weeklyTargets, today, nowMin), [JSON.stringify(s.weeklyTargets), today, Math.floor(nowMin / 10)])
  if (!rows?.length) return null

  return (
    <Card className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display font-semibold">
          <Target className="size-4 text-accent" aria-hidden /> Target minggu ini
        </h2>
        <Link to="/pengaturan" className="flex min-h-11 items-center gap-0.5 rounded-xl px-2 text-sm text-accent-2 hover:bg-white/5">
          Atur <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>
      <ul className="space-y-2">
        {rows.map((r) => {
          const c = map.get(r.categoryId) ?? FALLBACK_CATEGORY
          return (
            <li key={r.categoryId}>
              <div className="mb-1 flex items-center gap-2 text-[13px]">
                <span className="size-2 rounded-full" style={{ background: c.color }} aria-hidden />
                <span className="flex-1 truncate">{c.name}</span>
                {r.behind && <span className="rounded-full bg-[#f59e0b]/15 px-2 text-[11px] font-semibold text-[#f59e0b]">tertinggal</span>}
                <span className="tabular-nums text-muted">
                  {durationLabel(r.done)} / {durationLabel(r.target)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/6" role="progressbar" aria-valuenow={r.pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${c.name} ${r.pct}%`}>
                <div className={cn('h-full rounded-full transition-all', r.pct >= 100 && 'shadow-[0_0_8px_currentColor]')} style={{ width: `${r.pct}%`, background: c.color, color: c.color }} />
              </div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

/** Peringatan bila ada jadwal melewati jam tidur */
export function BedtimeWarning({ lastEnd }: { lastEnd: number }) {
  const { bedtimeHour } = useSettings()
  if (!bedtimeHour || lastEnd <= bedtimeHour * 60) return null
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-3.5 py-2.5 text-[13px]" role="status">
      <BedDouble className="size-5 shrink-0 text-[#f59e0b]" aria-hidden />
      <span>
        Ada jadwal sampai <b>{minToHHMM(lastEnd)}</b>, lewat jam tidurmu ({minToHHMM(bedtimeHour * 60)}). Geser kalau bisa.
      </span>
    </div>
  )
}
