import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

const SIZE = 300
const C = SIZE / 2
const R = 128
const CIRC = 2 * Math.PI * R
const TICKS = 60

/**
 * Cincin timer: busur gradien yang tumbuh seiring waktu, 60 garis detik,
 * titik bercahaya di ujung busur, dan halo yang "bernapas" saat berjalan.
 */
export function FocusRing({
  progress,
  running,
  tone,
  children,
}: {
  progress: number
  running: boolean
  tone: 'focus' | 'break'
  children: ReactNode
}) {
  const p = Math.min(1, Math.max(0, progress))
  const angle = p * 2 * Math.PI - Math.PI / 2
  const head = { x: C + R * Math.cos(angle), y: C + R * Math.sin(angle) }
  const stops = tone === 'focus' ? ['var(--accent)', 'var(--accent-2)'] : ['var(--accent-3)', 'var(--accent-2)']

  return (
    <div className="relative mx-auto aspect-square w-[min(80vw,320px)]">
      <div
        className={cn('absolute inset-[12%] rounded-full blur-3xl transition-opacity duration-700', running ? 'animate-breathe opacity-70' : 'opacity-30')}
        style={{ background: `radial-gradient(circle, ${stops[0]}, transparent 70%)` }}
        aria-hidden
      />
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="relative size-full" aria-hidden>
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={stops[0]} />
            <stop offset="1" stopColor={stops[1]} />
          </linearGradient>
          <filter id="ring-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* garis detik */}
        {Array.from({ length: TICKS }, (_, i) => {
          const a = (i / TICKS) * 2 * Math.PI - Math.PI / 2
          const long = i % 5 === 0
          const r1 = R - 20
          const r2 = R - (long ? 30 : 25)
          const passed = i / TICKS <= p && p > 0
          return (
            <line
              key={i}
              x1={C + r1 * Math.cos(a)}
              y1={C + r1 * Math.sin(a)}
              x2={C + r2 * Math.cos(a)}
              y2={C + r2 * Math.sin(a)}
              stroke={passed ? stops[0] : 'var(--line)'}
              strokeOpacity={passed ? 0.9 : 1}
              strokeWidth={long ? 2.4 : 1.4}
              strokeLinecap="round"
            />
          )
        })}

        <circle cx={C} cy={C} r={R} fill="none" stroke="var(--line)" strokeWidth="14" />
        <circle
          cx={C}
          cy={C}
          r={R}
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${p * CIRC} ${CIRC}`}
          transform={`rotate(-90 ${C} ${C})`}
          filter="url(#ring-glow)"
          className="transition-[stroke-dasharray] duration-500 ease-linear"
        />
        {p > 0.002 && (
          <>
            <circle cx={head.x} cy={head.y} r="11" fill={stops[1]} opacity=".35" filter="url(#ring-glow)" />
            <circle cx={head.x} cy={head.y} r="5.5" fill="#fff" />
          </>
        )}
      </svg>
      <div className="absolute inset-[22%] grid place-items-center rounded-full text-center">{children}</div>
    </div>
  )
}
