import { Pencil } from 'lucide-react'
import { Button, Sheet } from '@/components/ui'
import type { DateKey, Habit } from '@/db/types'
import { fmt, fromKey } from '@/lib/date'
import { completionRate, currentStreak, isDue, lastNDays, longestStreak } from '@/lib/habits'
import { alpha } from '@/lib/icons'
import { cn } from '@/lib/cn'
import { toggleHabit } from './useHabits'

const DAY_NAMES = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

export function HabitDetail({
  habit,
  done,
  today,
  onEdit,
  onClose,
}: {
  habit: Habit
  done: Set<DateKey>
  today: DateKey
  onEdit: () => void
  onClose: () => void
}) {
  const days = lastNDays(today, 30)
  // Geser awal supaya kolom pertama = Senin
  const lead = (fromKey(days[0]).getDay() + 6) % 7
  const stats = [
    { label: 'Streak sekarang', value: currentStreak(habit, done, today), unit: 'hari' },
    { label: 'Terpanjang', value: longestStreak(habit, done, today), unit: 'hari' },
    { label: '30 hari', value: completionRate(habit, done, today), unit: '%' },
  ]

  return (
    <Sheet
      open
      onClose={onClose}
      title={`${habit.emoji} ${habit.name}`}
      footer={
        <Button icon={Pencil} className="flex-1" onClick={onEdit}>
          Ubah kebiasaan
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-line p-3 text-center">
              <div className="font-display text-2xl font-semibold tabular-nums" style={{ color: habit.color }}>
                {s.value}
                <span className="ml-0.5 text-sm text-muted">{s.unit}</span>
              </div>
              <div className="text-[11px] text-muted">{s.label}</div>
            </div>
          ))}
        </div>

        <div>
          <p className="mb-2 text-[13px] text-muted">30 hari terakhir · ketuk tanggal untuk mencentang/membatalkan</p>
          <div className="grid grid-cols-7 gap-1.5" role="grid" aria-label="Kalender 30 hari">
            {DAY_NAMES.map((n) => (
              <span key={n} className="pb-1 text-center text-[11px] font-medium text-faint" aria-hidden>
                {n}
              </span>
            ))}
            {Array.from({ length: lead }, (_, i) => (
              <span key={`pad${i}`} aria-hidden />
            ))}
            {days.map((d) => {
              const hit = done.has(d)
              const due = isDue(habit, d)
              const future = d > today
              return (
                <button
                  key={d}
                  type="button"
                  role="gridcell"
                  aria-pressed={hit}
                  aria-label={`${fmt(d, 'EEEE d MMMM')}${hit ? ', tercentang' : ''}${!due ? ', bukan jadwal' : ''}`}
                  disabled={future}
                  onClick={() => toggleHabit(habit, d)}
                  className={cn(
                    'grid aspect-square min-h-11 place-items-center rounded-xl text-sm tabular-nums transition active:scale-90',
                    d === today && 'ring-2 ring-ink/70',
                    !hit && (due ? 'bg-white/6 text-muted' : 'border border-dashed border-line text-faint'),
                  )}
                  style={hit ? { background: habit.color, color: 'var(--bg)', fontWeight: 700, boxShadow: `0 0 12px -2px ${alpha(habit.color, 0.8)}` } : undefined}
                >
                  {fmt(d, 'd')}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </Sheet>
  )
}
