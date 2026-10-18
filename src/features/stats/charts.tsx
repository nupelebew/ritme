import { useState } from 'react'
import { useNavigate } from 'react-router'
import type { DateKey } from '@/db/types'
import { durationLabel, fmt } from '@/lib/date'
import { LEVEL_LABELS, levelOf, type Bucket } from '@/lib/stats'
import { cn } from '@/lib/cn'

/** Grafik batang satu seri (jam fokus) dengan tooltip saat hover/ketuk; label langsung hanya di nilai tertinggi & terbaru */
export function TrendBars({ data }: { data: Bucket[] }) {
  const [active, setActive] = useState<number | null>(null)
  const max = Math.max(60, ...data.map((d) => d.focusMin))
  const peak = data.reduce((m, d, i) => (d.focusMin > data[m].focusMin ? i : m), 0)
  const last = data.length - 1
  const shown = active ?? null

  return (
    <div className="relative">
      <div className="flex h-44 items-end gap-[2px] border-b border-line pt-6" onPointerLeave={() => setActive(null)}>
        {data.map((d, i) => {
          const h = (d.focusMin / max) * 100
          const label = i === peak || i === last ? durationLabel(d.focusMin) : null
          return (
            <button
              key={d.key}
              type="button"
              className="group relative flex h-full flex-1 flex-col items-center justify-end"
              onPointerEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(i === active ? null : i)}
              aria-label={`${d.label}: fokus ${durationLabel(d.focusMin)}, ${d.tasksDone} tugas selesai`}
            >
              {label && d.focusMin > 0 && active === null && (
                <span className="absolute -translate-y-full whitespace-nowrap pb-1 text-[10px] font-medium tabular-nums text-muted" style={{ bottom: `${h}%` }}>
                  {label}
                </span>
              )}
              <span
                className={cn(
                  'w-full max-w-7 rounded-t-[4px] transition-[filter,opacity]',
                  i === last ? 'bg-accent-2' : 'bg-accent-2/55',
                  active !== null && active !== i && 'opacity-45',
                )}
                style={{ height: `${Math.max(d.focusMin ? 2 : 0, h)}%` }}
              />
            </button>
          )
        })}
      </div>
      <div className="mt-1 flex h-4 gap-[2px]">
        {data.map((d, i) => {
          const step = data.length > 8 ? 3 : 1
          const show = (last - i) % step === 0
          return (
            <span key={d.key} className="relative flex-1 text-center text-[10px] text-faint" aria-hidden={!show}>
              {show && <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap">{d.label}</span>}
            </span>
          )
        })}
      </div>
      {shown !== null && (
        <div
          className="glass-strong pointer-events-none absolute top-0 z-10 rounded-xl px-3 py-2 text-xs"
          style={{ left: `clamp(0px, calc(${((shown + 0.5) / data.length) * 100}% - 70px), calc(100% - 140px))`, width: 140 }}
          role="status"
        >
          <p className="font-semibold">{data[shown].label}</p>
          <p className="text-muted">Fokus: <span className="text-ink tabular-nums">{durationLabel(data[shown].focusMin)}</span></p>
          <p className="text-muted">Tugas selesai: <span className="text-ink tabular-nums">{data[shown].tasksDone}</span></p>
        </div>
      )}
    </div>
  )
}

const LEVEL_MIX = [0, 28, 50, 75, 100]
export const levelColor = (l: number) => (l === 0 ? 'var(--line)' : `color-mix(in srgb, var(--accent-2) ${LEVEL_MIX[l]}%, var(--bg))`)

/** Heatmap kalender: satu hue, makin pekat makin lama fokus. Ketuk sel → buka riwayat tanggal itu. */
export function Heatmap({ columns, values, today }: { columns: (DateKey | null)[][]; values: Map<DateKey, number>; today: DateKey }) {
  const nav = useNavigate()
  const [tip, setTip] = useState<DateKey | null>(null)
  // Label bulan di kolom yang memuat tanggal 1 (dan kolom pertama)
  const monthLabel = (col: (DateKey | null)[], i: number) => {
    const first = col.find((d) => d?.endsWith('-01')) ?? (i === 0 ? col[0] : null)
    return first ? fmt(first, 'MMM') : ''
  }
  const grid = { gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }
  return (
    <div>
      <div className="mb-1 flex gap-1 text-[10px] leading-none text-faint" aria-hidden>
        <span className="w-[18px] shrink-0" />
        <div className="grid flex-1 gap-[3px]" style={grid}>
          {columns.map((col, i) => (
            <span key={i} className="overflow-visible whitespace-nowrap">
              {monthLabel(col, i)}
            </span>
          ))}
        </div>
      </div>
      <div className="flex gap-1">
        <div className="grid w-[18px] shrink-0 grid-rows-7 gap-[3px] text-[9px] leading-none text-faint" aria-hidden>
          {['Sen', '', 'Rab', '', 'Jum', '', 'Min'].map((d, i) => (
            <span key={i} className="flex items-center">{d}</span>
          ))}
        </div>
        <div className="grid flex-1 gap-[3px]" style={grid} role="grid" aria-label="Heatmap jam fokus harian">
          {columns.map((col, ci) => (
            <div key={ci} className="grid grid-rows-7 gap-[3px]" role="row">
              {col.map((d, ri) =>
                d ? (
                  <button
                    key={d}
                    type="button"
                    role="gridcell"
                    onPointerEnter={() => setTip(d)}
                    onPointerLeave={() => setTip(null)}
                    onClick={() => nav(`/riwayat?d=${d}`)}
                    aria-label={`${fmt(d, 'EEEE d MMMM')}: ${durationLabel(values.get(d) ?? 0)} fokus. Buka riwayat.`}
                    className={cn('aspect-square rounded-[3px] transition hover:ring-1 hover:ring-ink/60', d === today && 'ring-1 ring-ink/70')}
                    style={{ background: levelColor(levelOf(values.get(d) ?? 0)) }}
                  />
                ) : (
                  <span key={ri} className="aspect-square" />
                ),
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted">
        <span className="min-h-4 truncate" role="status">
          {tip ? `${fmt(tip, 'EEE, d MMM')}: ${durationLabel(values.get(tip) ?? 0)}` : 'Ketuk kotak untuk membuka riwayat'}
        </span>
        <span className="flex shrink-0 items-center gap-1" aria-label="Legenda intensitas">
          Sedikit
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className="size-2.5 rounded-[2px]" style={{ background: levelColor(l) }} title={LEVEL_LABELS[l]} />
          ))}
          Banyak
        </span>
      </div>
    </div>
  )
}
