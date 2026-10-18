import { Link } from 'react-router'
import { ChevronRight, Trophy } from 'lucide-react'
import type { Category, Task } from '@/db/types'
import { Card } from '@/components/ui'
import type { Scored } from '@/lib/priority'
import { cn } from '@/lib/cn'
import { TaskCheck, TaskMeta } from './TaskRow'

/** "3 hal terpenting hari ini" berdasarkan skor prioritas lokal */
export function TopThree({
  ranked,
  doneToday,
  categories,
  today,
  onToggle,
  onOpen,
  showLink,
}: {
  ranked: Scored[]
  doneToday: number
  categories: Map<string, Category>
  today: string
  onToggle: (t: Task) => void
  onOpen: (t: Task) => void
  showLink?: boolean
}) {
  return (
    <Card className="relative overflow-hidden p-0">
      <div
        className="pointer-events-none absolute -right-10 -top-16 size-44 rounded-full opacity-40 blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--accent), transparent 70%)' }}
        aria-hidden
      />
      <div className="flex items-center justify-between gap-2 px-4 pt-4">
        <div>
          <h2 className="font-display text-lg font-semibold">3 hal terpenting</h2>
          <p className="text-xs text-muted">
            {ranked.length ? 'Diurutkan dari tenggat, prioritas, dan progres' : 'Tambahkan tugas untuk melihat fokus harianmu'}
            {doneToday > 0 && ` · ${doneToday} selesai hari ini`}
          </p>
        </div>
        {showLink && (
          <Link to="/tugas" className="flex min-h-11 items-center gap-0.5 rounded-xl px-2 text-sm text-accent-2 hover:bg-white/5">
            Semua <ChevronRight className="size-4" aria-hidden />
          </Link>
        )}
      </div>

      {ranked.length === 0 ? (
        <div className="flex items-center gap-3 px-4 py-5 text-sm text-muted">
          <Trophy className="size-5 text-accent-3" aria-hidden />
          {doneToday > 0 ? 'Semua tugas beres. Waktunya santai!' : 'Belum ada tugas aktif.'}
        </div>
      ) : (
        <ol className="px-2 pb-2 pt-1">
          {ranked.map(({ task, reasons }, i) => (
            <li key={task.id} className="flex items-start gap-1 rounded-2xl pr-2 transition hover:bg-white/4">
              <span
                className={cn(
                  'mt-3 w-5 shrink-0 text-center font-display text-sm font-bold',
                  i === 0 ? 'text-gradient' : 'text-faint',
                )}
                aria-hidden
              >
                {i + 1}
              </span>
              <TaskCheck task={task} onToggle={() => onToggle(task)} size="lg" />
              <button type="button" onClick={() => onOpen(task)} className="min-h-11 min-w-0 flex-1 py-2 text-left">
                <span className="block font-medium leading-snug">{task.title}</span>
                <span className="mt-1 block">
                  <TaskMeta task={task} category={categories.get(task.categoryId)} today={today} />
                </span>
                {reasons.length > 0 && (
                  <span className="mt-1.5 flex flex-wrap gap-1">
                    {reasons.slice(0, 2).map((r) => (
                      <span key={r} className="rounded-full bg-white/6 px-2 py-0.5 text-[11px] text-muted">
                        {r}
                      </span>
                    ))}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}
