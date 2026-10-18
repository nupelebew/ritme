import { NavLink } from 'react-router'
import { CalendarClock, Flame, LayoutGrid, ListChecks, Timer } from 'lucide-react'
import { cn } from '@/lib/cn'

const items = [
  { to: '/', label: 'Hari ini', icon: CalendarClock, end: true },
  { to: '/tugas', label: 'Tugas', icon: ListChecks },
  { to: '/fokus', label: 'Fokus', icon: Timer },
  { to: '/kebiasaan', label: 'Kebiasaan', icon: Flame },
  { to: '/lainnya', label: 'Lainnya', icon: LayoutGrid },
]

export function BottomNav() {
  return (
    <nav aria-label="Navigasi utama" className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-safe">
      <ul className="glass-strong flex w-full max-w-md items-stretch justify-between rounded-[26px] p-1.5">
        {items.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-[20px] text-[11px] font-medium transition',
                  isActive ? 'bg-white/10 text-ink' : 'text-faint hover:text-muted',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn('size-[22px] transition', isActive && 'text-accent-2 drop-shadow-[0_0_10px_var(--accent-2)]')}
                    strokeWidth={isActive ? 2.2 : 1.8}
                    aria-hidden
                  />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
