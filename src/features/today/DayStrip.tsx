import { startOfWeek } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { IconButton } from '@/components/ui'
import type { DateKey } from '@/db/types'
import { fmt, fromKey, shiftKey, toKey, todayKey } from '@/lib/date'
import { cn } from '@/lib/cn'

export function DayStrip({ value, onChange }: { value: DateKey; onChange: (d: DateKey) => void }) {
  const monday = toKey(startOfWeek(fromKey(value), { weekStartsOn: 1 }))
  const days = Array.from({ length: 7 }, (_, i) => shiftKey(monday, i))
  const today = todayKey()

  return (
    <div className="flex items-center gap-1">
      <IconButton icon={ChevronLeft} label="Minggu sebelumnya" onClick={() => onChange(shiftKey(value, -7))} className="-ml-2" />
      <ol className="grid flex-1 grid-cols-7 gap-1">
        {days.map((d) => {
          const sel = d === value
          const isToday = d === today
          return (
            <li key={d}>
              <button
                type="button"
                aria-current={sel ? 'date' : undefined}
                aria-label={fmt(d, 'EEEE, d MMMM')}
                onClick={() => onChange(d)}
                className={cn(
                  'flex min-h-14 w-full flex-col items-center justify-center rounded-2xl transition',
                  sel ? 'bg-[linear-gradient(160deg,var(--accent),var(--accent-2))] text-on-accent shadow-[0_6px_20px_-6px_var(--accent)]' : 'hover:bg-white/5',
                )}
              >
                <span className={cn('text-[10px] font-medium uppercase', !sel && 'text-faint')}>{fmt(d, 'EEEEEE')}</span>
                <span className="font-display text-[17px] font-semibold tabular-nums leading-tight">{fmt(d, 'd')}</span>
                <span className={cn('mt-0.5 size-1 rounded-full', isToday ? (sel ? 'bg-on-accent' : 'bg-accent-2') : 'bg-transparent')} />
              </button>
            </li>
          )
        })}
      </ol>
      <IconButton icon={ChevronRight} label="Minggu berikutnya" onClick={() => onChange(shiftKey(value, 7))} className="-mr-2" />
    </div>
  )
}
