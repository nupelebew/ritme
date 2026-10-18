import { Check, Flame } from 'lucide-react'
import type { DateKey, Habit } from '@/db/types'
import { fmt } from '@/lib/date'
import { currentStreak, isDue, lastNDays } from '@/lib/habits'
import { alpha } from '@/lib/icons'
import { cn } from '@/lib/cn'

/** Tombol emoji bulat untuk mencentang hari ini */
export function HabitToggle({
  habit,
  checked,
  due,
  onToggle,
  size = 56,
}: {
  habit: Habit
  checked: boolean
  due: boolean
  onToggle: () => void
  size?: number
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={`${habit.name}: ${checked ? 'sudah' : 'belum'} hari ini`}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      className={cn(
        'relative grid shrink-0 place-items-center rounded-full border-2 transition active:scale-90',
        !due && !checked && 'opacity-45',
      )}
      style={{
        width: size,
        height: size,
        borderColor: checked ? habit.color : alpha(habit.color, 0.45),
        background: checked ? `radial-gradient(circle at 30% 25%, ${alpha(habit.color, 0.85)}, ${alpha(habit.color, 0.45)})` : alpha(habit.color, 0.08),
        boxShadow: checked ? `0 0 22px -4px ${habit.color}` : undefined,
      }}
    >
      <span key={String(checked)} className={cn('leading-none', checked && 'animate-pop')} style={{ fontSize: size * 0.45 }} aria-hidden>
        {habit.emoji}
      </span>
      {checked && (
        <span className="absolute -bottom-0.5 -right-0.5 grid size-5 place-items-center rounded-full border-2 border-bg bg-accent-3">
          <Check className="size-3 text-bg" strokeWidth={3.5} aria-hidden />
        </span>
      )}
    </button>
  )
}

export function StreakBadge({ n }: { n: number }) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-semibold tabular-nums', n > 0 ? 'text-[#fb923c]' : 'text-faint')}>
      <Flame className={cn('size-3.5', n >= 7 && 'drop-shadow-[0_0_6px_#fb923c]')} aria-hidden />
      {n} hari
    </span>
  )
}

/** Kalender 30 hari ringkas (tampilan saja) */
export function MiniCalendar({ habit, done, today }: { habit: Habit; done: Set<DateKey>; today: DateKey }) {
  const days = lastNDays(today, 30)
  const count = days.filter((d) => done.has(d)).length
  return (
    <div className="grid grid-cols-15 gap-[3px]" role="img" aria-label={`${count} dari 30 hari terakhir tercentang`}>
      {days.map((d) => {
        const hit = done.has(d)
        const due = isDue(habit, d)
        return (
          <span
            key={d}
            title={fmt(d, 'EEE d MMM')}
            className={cn('aspect-square rounded-[4px]', d === today && 'ring-1 ring-ink/60')}
            style={{
              background: hit ? habit.color : due ? 'var(--line)' : 'transparent',
              border: !hit && !due ? '1px dashed var(--line)' : undefined,
              boxShadow: hit ? `0 0 6px -1px ${habit.color}` : undefined,
            }}
          />
        )
      })}
    </div>
  )
}

export const streakOf = currentStreak
