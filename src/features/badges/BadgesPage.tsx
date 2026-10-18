import { Link } from 'react-router'
import { ChevronRight, Sparkles } from 'lucide-react'
import { BackHeader } from '@/components/BackHeader'
import { Card } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useAchievements } from './useAchievements'

export function BadgesPage() {
  const data = useAchievements()
  if (!data) return <BackHeader title="Lencana & level" />
  const { level, badges } = data
  const unlocked = badges.filter((b) => b.unlocked).length
  const pct = level.span ? Math.round((level.into / level.span) * 100) : 100

  return (
    <div className="animate-rise space-y-4">
      <BackHeader title="Lencana & level" sub={`${unlocked}/${badges.length} lencana terbuka`} />

      <Card className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full opacity-40 blur-3xl" style={{ background: 'radial-gradient(circle, var(--accent), transparent 70%)' }} aria-hidden />
        <p className="text-xs uppercase tracking-[0.14em] text-faint">Level {level.level}</p>
        <p className="font-display text-3xl font-semibold text-gradient">{level.title}</p>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/8" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Menuju level berikutnya">
          <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--accent-2))]" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-muted tabular-nums">
          {level.xp.toLocaleString('id-ID')} XP · {(level.span - level.into).toLocaleString('id-ID')} XP lagi ke level {level.level + 1}
        </p>
        <p className="mt-2 text-[11px] text-faint">XP: 1/menit fokus · 10/tugas · 5/centang kebiasaan · 50/milestone skripsi · 20/invoice lunas</p>
      </Card>

      <Link to="/wrapped" className="glass flex min-h-16 items-center gap-3 rounded-3xl px-4 hover:bg-white/5">
        <Sparkles className="size-5 text-accent-2" aria-hidden />
        <span className="flex-1">
          <span className="block font-semibold">Ritme Wrapped</span>
          <span className="block text-xs text-muted">Rekap bulananmu, siap dibagikan</span>
        </span>
        <ChevronRight className="size-5 text-faint" aria-hidden />
      </Link>

      <ul className="grid grid-cols-2 gap-3">
        {badges.map((b) => (
          <li key={b.id}>
            <Card className={cn('h-full space-y-1.5 p-3.5', !b.unlocked && 'opacity-70')}>
              <span className={cn('block text-3xl', !b.unlocked && 'grayscale')} aria-hidden>
                {b.emoji}
              </span>
              <p className="text-sm font-semibold leading-snug">{b.name}</p>
              <p className="text-[11px] leading-snug text-muted">{b.desc}</p>
              {b.unlocked ? (
                <p className="text-[11px] font-semibold text-accent-3">Terbuka ✓</p>
              ) : (
                <div className="h-1.5 overflow-hidden rounded-full bg-white/8" role="progressbar" aria-valuenow={Math.round(b.progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`Progres ${b.name}`}>
                  <div className="h-full rounded-full bg-accent-2" style={{ width: `${b.progress * 100}%` }} />
                </div>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </div>
  )
}
