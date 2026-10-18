import { Link } from 'react-router'
import { ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui'
import { currentStreak, isDue } from '@/lib/habits'
import { HabitToggle } from './HabitParts'
import { toggleHabit, useHabits } from './useHabits'

/** Centang kebiasaan langsung dari halaman Hari ini */
export function HabitStrip() {
  const { habits, done, today, ready } = useHabits()
  const due = habits.filter((h) => isDue(h, today))
  if (!ready || due.length === 0) return null
  const count = due.filter((h) => done(h.id).has(today)).length

  return (
    <Card className="p-0">
      <div className="flex items-center justify-between px-4 pt-3">
        <h2 className="font-display font-semibold">
          Kebiasaan <span className="text-sm font-normal text-muted">· {count}/{due.length}</span>
        </h2>
        <Link to="/kebiasaan" className="flex min-h-11 items-center gap-0.5 rounded-xl px-2 text-sm text-accent-2 hover:bg-white/5">
          Detail <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>
      <ul className="scroll-thin flex gap-3 overflow-x-auto px-4 pb-3 pt-1">
        {due.map((h) => {
          const set = done(h.id)
          const s = currentStreak(h, set, today)
          return (
            <li key={h.id} className="flex w-16 shrink-0 flex-col items-center gap-1 text-center">
              <HabitToggle habit={h} checked={set.has(today)} due onToggle={() => toggleHabit(h, today)} size={52} />
              <span className="line-clamp-2 text-[11px] leading-tight text-muted">{h.name}</span>
              {s > 0 && <span className="text-[10px] font-semibold text-[#fb923c]">🔥 {s}</span>}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
