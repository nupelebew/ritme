import type { Category } from '@/db/types'
import { FALLBACK_CATEGORY } from '@/db/hooks'
import { Card } from '@/components/ui'
import { durationLabel, minToHHMM } from '@/lib/date'
import type { Occurrence } from '@/lib/schedule'

const R = 52
const C = 2 * Math.PI * R

/** Cincin hari: tiap kegiatan jadi busur berwarna kategori di sepanjang jam aktif. */
export function DaySummary({
  items,
  categories,
  startHour,
  endHour,
  nowMin,
  focusMin = 0,
}: {
  items: Occurrence[]
  categories: Map<string, Category>
  startHour: number
  endHour: number
  nowMin?: number
  focusMin?: number
}) {
  const base = startHour * 60
  const span = (endHour - startHour) * 60
  const frac = (m: number) => Math.min(1, Math.max(0, (m - base) / span))

  const total = items.reduce((s, o) => s + (o.end - o.start), 0)
  const byCat = new Map<string, number>()
  for (const o of items) byCat.set(o.categoryId, (byCat.get(o.categoryId) ?? 0) + (o.end - o.start))
  const legend = [...byCat.entries()].sort((a, b) => b[1] - a[1])

  const current = nowMin !== undefined ? items.find((o) => o.start <= nowMin && o.end > nowMin) : undefined
  const next = nowMin !== undefined ? items.find((o) => o.start > nowMin) : undefined
  const nowAngle = nowMin !== undefined ? frac(nowMin) * 360 - 90 : null

  return (
    <Card className="flex items-center gap-4 p-4">
      <div className="relative size-[132px] shrink-0">
        <svg viewBox="0 0 132 132" className="size-full -rotate-90" aria-hidden>
          <circle cx="66" cy="66" r={R} fill="none" stroke="var(--line)" strokeWidth="12" />
          {nowMin !== undefined && (
            <circle
              cx="66"
              cy="66"
              r={R + 9}
              fill="none"
              stroke="var(--accent-2)"
              strokeOpacity=".5"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={`${frac(nowMin) * 2 * Math.PI * (R + 9)} 999`}
            />
          )}
          {items.map((o) => {
            const cat = categories.get(o.categoryId) ?? FALLBACK_CATEGORY
            const a = frac(o.start)
            const b = frac(o.end)
            const len = Math.max(0, (b - a) * C - 2)
            return (
              <circle
                key={o.key}
                cx="66"
                cy="66"
                r={R}
                fill="none"
                stroke={cat.color}
                strokeWidth="12"
                strokeDasharray={`${len} ${C}`}
                strokeDashoffset={-a * C}
                style={{ filter: `drop-shadow(0 0 4px ${cat.color})` }}
              />
            )
          })}
        </svg>
        {nowAngle !== null && (
          <span
            className="absolute left-1/2 top-1/2 size-3 rounded-full border-2 border-bg bg-ink shadow-[0_0_10px_var(--accent-2)]"
            style={{ transform: `translate(-50%,-50%) rotate(${nowAngle}deg) translateX(${R}px)` }}
            aria-hidden
          />
        )}
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="font-display text-xl font-semibold leading-none">{total ? durationLabel(total) : '–'}</div>
            <div className="mt-1 text-[11px] text-muted">terjadwal</div>
            {focusMin > 0 && (
              <div className="mt-1.5 text-[11px] font-semibold text-accent-2" title="Total sesi fokus tercatat">
                ⏱ {durationLabel(focusMin)} fokus
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        {current ? (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-accent-3">Sedang berjalan</p>
            <p className="truncate font-semibold">{current.title}</p>
            <p className="text-xs text-muted">sampai {minToHHMM(current.end)}</p>
          </div>
        ) : next ? (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-accent-2">Berikutnya</p>
            <p className="truncate font-semibold">{next.title}</p>
            <p className="text-xs text-muted">
              {minToHHMM(next.start)} · {nowMin !== undefined ? `dalam ${durationLabel(next.start - nowMin)}` : ''}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">
              {items.length ? 'Jadwal hari ini' : 'Masih kosong'}
            </p>
            <p className="text-sm text-muted">
              {items.length ? `${items.length} kegiatan` : 'Ketuk jam di timeline untuk menambah.'}
            </p>
          </div>
        )}
        {legend.length > 0 && (
          <ul className="space-y-1">
            {legend.slice(0, 4).map(([id, min]) => {
              const cat = categories.get(id) ?? FALLBACK_CATEGORY
              return (
                <li key={id} className="flex items-center gap-2 text-xs">
                  <span className="size-2 shrink-0 rounded-full" style={{ background: cat.color }} aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-muted">{cat.name}</span>
                  <span className="tabular-nums">{durationLabel(min)}</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Card>
  )
}
