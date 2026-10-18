import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import type { Category } from '@/db/types'
import { FALLBACK_CATEGORY } from '@/db/hooks'
import { minToHHMM } from '@/lib/date'
import { alpha, iconFor } from '@/lib/icons'
import { layoutColumns, snap, type Occurrence } from '@/lib/schedule'
import { cn } from '@/lib/cn'

const HOUR = 64 // px per jam
const PPM = HOUR / 60
const GUTTER = 52
const LONG_PRESS_MS = 280

interface Drag {
  key: string
  mode: 'move' | 'resize'
  pointerId: number
  startY: number
  origStart: number
  origEnd: number
  start: number
  end: number
  active: boolean
}

export function Timeline({
  items,
  categories,
  startHour,
  endHour,
  nowMin,
  onCreateAt,
  onOpen,
  onChange,
}: {
  items: Occurrence[]
  categories: Map<string, Category>
  startHour: number
  endHour: number
  /** Menit sekarang bila tanggal yang dilihat adalah hari ini */
  nowMin?: number
  onCreateAt: (min: number) => void
  onOpen: (o: Occurrence) => void
  onChange: (o: Occurrence, start: number, end: number) => void
}) {
  const [drag, setDrag] = useState<Drag | null>(null)
  const dragRef = useRef<Drag | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const suppressClick = useRef(false)
  const nowRef = useRef<HTMLDivElement>(null)
  const minBase = startHour * 60
  const minMax = endHour * 60
  const height = (endHour - startHour) * HOUR

  const update = (d: Drag | null) => {
    dragRef.current = d
    setDrag(d)
  }

  // Cegah halaman ikut menggulir saat blok sedang diseret di layar sentuh
  useEffect(() => {
    const block = (e: TouchEvent) => dragRef.current?.active && e.preventDefault()
    window.addEventListener('touchmove', block, { passive: false })
    return () => window.removeEventListener('touchmove', block)
  }, [])

  // Gulir otomatis ke garis "sekarang" saat pertama dibuka
  const scrolled = useRef(false)
  useLayoutEffect(() => {
    if (scrolled.current || nowMin === undefined || !nowRef.current) return
    scrolled.current = true
    nowRef.current.scrollIntoView({ block: 'center', behavior: 'auto' })
  }, [nowMin])

  const activate = (d: Drag, el: Element) => {
    try {
      el.setPointerCapture(d.pointerId)
    } catch {
      /* elemen bisa saja sudah hilang */
    }
    navigator.vibrate?.(8)
    update({ ...d, active: true })
  }

  const onPointerDown = (e: RPointerEvent, o: Occurrence, mode: Drag['mode']) => {
    if (e.button !== 0) return
    e.stopPropagation()
    const d: Drag = {
      key: o.key,
      mode,
      pointerId: e.pointerId,
      startY: e.clientY,
      origStart: o.start,
      origEnd: o.end,
      start: o.start,
      end: o.end,
      active: false,
    }
    const el = e.currentTarget
    if (mode === 'resize') {
      activate(d, el)
      return
    }
    update(d)
    if (e.pointerType !== 'mouse') {
      timer.current = window.setTimeout(() => {
        if (dragRef.current?.key === o.key) activate(dragRef.current, el)
      }, LONG_PRESS_MS)
    }
  }

  const onPointerMove = (e: RPointerEvent) => {
    const d = dragRef.current
    if (!d || e.pointerId !== d.pointerId) return
    const dy = e.clientY - d.startY
    if (!d.active) {
      if (e.pointerType === 'mouse' && Math.abs(dy) > 4) activate(d, e.currentTarget)
      else if (Math.abs(dy) > 8) {
        clearTimeout(timer.current)
        update(null)
      }
      return
    }
    const delta = snap(dy / PPM)
    if (d.mode === 'move') {
      const len = d.origEnd - d.origStart
      const start = Math.min(Math.max(minBase, d.origStart + delta), minMax - len)
      update({ ...d, start, end: start + len })
    } else {
      update({ ...d, end: Math.min(minMax, Math.max(d.origStart + 15, d.origEnd + delta)) })
    }
  }

  const finish = (e: RPointerEvent, cancelled = false) => {
    const d = dragRef.current
    if (!d || e.pointerId !== d.pointerId) return
    clearTimeout(timer.current)
    if (d.active) {
      suppressClick.current = true
      setTimeout(() => (suppressClick.current = false), 50)
      const o = items.find((x) => x.key === d.key)
      if (!cancelled && o && (d.start !== d.origStart || d.end !== d.origEnd)) onChange(o, d.start, d.end)
    }
    update(null)
  }

  const placed = layoutColumns(
    items.map((o) => (drag?.active && drag.key === o.key ? { ...o, start: drag.start, end: drag.end } : o)),
  )

  const onGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const min = snap(minBase + (e.clientY - rect.top) / PPM, 30)
    onCreateAt(Math.min(Math.max(minBase, min), minMax - 30))
  }

  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i)

  return (
    <div className="relative select-none" style={{ height: height + 16 }}>
      {/* Garis jam */}
      {hours.map((h) => (
        <div key={h} className="pointer-events-none absolute inset-x-0" style={{ top: (h - startHour) * HOUR }}>
          <span
            className={cn(
              'absolute -top-2 left-0 w-10 text-right font-display text-[11px] tabular-nums text-faint',
              nowMin !== undefined && Math.abs(nowMin - h * 60) < 14 && 'invisible',
            )}
          >
            {String(h % 24).padStart(2, '0')}:00
          </span>
          <div className="ml-[52px] border-t border-line" />
          {h < endHour && <div className="ml-[52px] border-t border-dashed border-line/50" style={{ marginTop: HOUR / 2 - 1 }} />}
        </div>
      ))}

      {/* Area kosong: ketuk untuk menambah */}
      <div
        className="absolute inset-y-0 right-0 cursor-copy"
        style={{ left: GUTTER, height }}
        onClick={onGridClick}
        role="presentation"
        aria-hidden
      />

      {/* Blok kegiatan */}
      <div className="pointer-events-none absolute inset-y-0 right-0" style={{ left: GUTTER + 4, height }}>
        {placed.map(({ item: o, col, cols }) => {
          const cat = categories.get(o.categoryId) ?? FALLBACK_CATEGORY
          const Icon = iconFor(cat.icon)
          const top = (Math.max(o.start, minBase) - minBase) * PPM
          const h = Math.max((Math.min(o.end, minMax) - Math.max(o.start, minBase)) * PPM - 3, 24)
          const isDragging = drag?.active && drag.key === o.key
          const past = nowMin !== undefined && o.end <= nowMin
          const compact = h < 44
          return (
            <div
              key={o.key}
              className={cn(
                'pointer-events-auto absolute overflow-hidden rounded-2xl border transition-[box-shadow,opacity,transform] [-webkit-touch-callout:none]',
                isDragging ? 'z-20 scale-[1.02] shadow-2xl' : 'z-10',
                past && !isDragging && 'opacity-55',
              )}
              style={{
                top,
                height: h,
                left: `calc(${(col / cols) * 100}% + ${col ? 2 : 0}px)`,
                width: `calc(${100 / cols}% - ${cols > 1 ? 4 : 2}px)`,
                background: `linear-gradient(135deg, ${alpha(cat.color, 0.32)}, ${alpha(cat.color, 0.14)})`,
                borderColor: alpha(cat.color, 0.45),
                boxShadow: isDragging ? `0 12px 40px -8px ${alpha(cat.color, 0.7)}` : undefined,
                backdropFilter: 'blur(12px)',
              }}
            >
              <button
                type="button"
                className="flex h-full w-full cursor-grab items-start gap-2 px-2.5 py-1.5 text-left active:cursor-grabbing"
                style={{ touchAction: isDragging ? 'none' : 'pan-y' }}
                onPointerDown={(e) => onPointerDown(e, o, 'move')}
                onPointerMove={onPointerMove}
                onPointerUp={(e) => finish(e)}
                onPointerCancel={(e) => finish(e, true)}
                onContextMenu={(e) => e.preventDefault()}
                onClick={() => !suppressClick.current && onOpen(o)}
                aria-label={`${o.title}, ${minToHHMM(o.start)} sampai ${minToHHMM(o.end)}, ${cat.name}. Ketuk untuk ubah.`}
              >
                <span className="absolute inset-y-0 left-0 w-1" style={{ background: cat.color }} aria-hidden />
                {!compact && <Icon className="mt-0.5 size-4 shrink-0" style={{ color: cat.color }} aria-hidden />}
                <span className={cn('min-w-0 flex-1', compact && 'flex items-baseline gap-2')}>
                  <span className="block truncate text-[13px] font-semibold leading-tight">{o.title}</span>
                  <span className="block truncate text-[11px] tabular-nums text-muted">
                    {minToHHMM(isDragging ? drag.start : o.start)}–{minToHHMM(isDragging ? drag.end : o.end)}
                    {o.masterId && !compact ? ' · berulang' : ''}
                  </span>
                </span>
              </button>
              {/* Pegangan untuk mengubah durasi */}
              <div
                className="absolute inset-x-0 bottom-0 flex h-3 cursor-ns-resize items-end justify-center pb-0.5"
                style={{ touchAction: 'none' }}
                onPointerDown={(e) => onPointerDown(e, o, 'resize')}
                onPointerMove={onPointerMove}
                onPointerUp={(e) => finish(e)}
                onPointerCancel={(e) => finish(e, true)}
                aria-hidden
              >
                <span className="h-1 w-8 rounded-full bg-white/35" />
              </div>
            </div>
          )
        })}
      </div>

      {/* Penanda waktu sekarang */}
      {nowMin !== undefined && nowMin >= minBase && nowMin <= minMax && (
        <div
          ref={nowRef}
          className="pointer-events-none absolute inset-x-0 z-30 flex items-center"
          style={{ top: (nowMin - minBase) * PPM - 9 }}
          aria-label={`Sekarang ${minToHHMM(nowMin)}`}
        >
          <span className="w-12 rounded-full bg-danger px-1 text-center font-display text-[11px] font-semibold tabular-nums text-white shadow-[0_0_12px_var(--danger)]">
            {minToHHMM(nowMin)}
          </span>
          <span className="size-2 rounded-full bg-danger" />
          <span className="h-0.5 flex-1 bg-danger/80 shadow-[0_0_8px_var(--danger)]" />
        </div>
      )}
    </div>
  )
}
