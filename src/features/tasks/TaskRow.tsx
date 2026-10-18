import { Check, CalendarDays, Flag, ListTree, Timer } from 'lucide-react'
import type { Category, Task } from '@/db/types'
import { FALLBACK_CATEGORY } from '@/db/hooks'
import { durationLabel } from '@/lib/date'
import { PRIORITY, daysUntil, dueLabel } from '@/lib/priority'
import { cn } from '@/lib/cn'

export function TaskCheck({ task, onToggle, size = 'md' }: { task: Task; onToggle: () => void; size?: 'md' | 'lg' }) {
  const color = PRIORITY[task.priority].color
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={task.done}
      aria-label={task.done ? `Tandai "${task.title}" belum selesai` : `Tandai "${task.title}" selesai`}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      className="group grid size-11 shrink-0 place-items-center rounded-full"
    >
      <span
        className={cn(
          'grid place-items-center rounded-full border-2 transition group-active:scale-90',
          size === 'lg' ? 'size-7' : 'size-6',
          task.done ? 'border-transparent' : 'group-hover:bg-white/5',
        )}
        style={task.done ? { background: color } : { borderColor: color }}
      >
        {task.done && <Check className="size-4 text-bg" strokeWidth={3} aria-hidden />}
      </span>
    </button>
  )
}

export function TaskMeta({ task, category, today }: { task: Task; category?: Category; today: string }) {
  const cat = category ?? FALLBACK_CATEGORY
  const subDone = task.subtasks.filter((s) => s.done).length
  const overdue = task.due && !task.done && daysUntil(task.due, today) < 0
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2 rounded-full" style={{ background: cat.color }} aria-hidden />
        {cat.name}
      </span>
      {task.due && (
        <span className={cn('inline-flex items-center gap-1', overdue && 'font-semibold text-danger')}>
          <CalendarDays className="size-3.5" aria-hidden />
          {dueLabel(task.due, today)}
        </span>
      )}
      {task.priority >= 3 && (
        <span className="inline-flex items-center gap-1" style={{ color: PRIORITY[task.priority].color }}>
          <Flag className="size-3.5" aria-hidden />
          {PRIORITY[task.priority].label}
        </span>
      )}
      {task.subtasks.length > 0 && (
        <span className="inline-flex items-center gap-1">
          <ListTree className="size-3.5" aria-hidden />
          {subDone}/{task.subtasks.length}
        </span>
      )}
      {task.estimateMin && (
        <span className="inline-flex items-center gap-1">
          <Timer className="size-3.5" aria-hidden />
          {durationLabel(task.estimateMin)}
        </span>
      )}
    </span>
  )
}

export function TaskRow({
  task,
  category,
  today,
  onToggle,
  onOpen,
}: {
  task: Task
  category?: Category
  today: string
  onToggle: () => void
  onOpen: () => void
}) {
  const subTotal = task.subtasks.length
  const subDone = task.subtasks.filter((s) => s.done).length
  return (
    <li className="relative flex items-start gap-1 py-1 pr-2">
      <TaskCheck task={task} onToggle={onToggle} />
      <button type="button" onClick={onOpen} className="min-h-11 min-w-0 flex-1 py-2 text-left">
        <span className={cn('block font-medium leading-snug', task.done && 'text-faint line-through')}>{task.title}</span>
        <span className="mt-1 block">
          <TaskMeta task={task} category={category} today={today} />
        </span>
        {subTotal > 0 && !task.done && (
          <span className="mt-2 block h-1 overflow-hidden rounded-full bg-white/8" aria-hidden>
            <span
              className="block h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--accent-3))] transition-all"
              style={{ width: `${(subDone / subTotal) * 100}%` }}
            />
          </span>
        )}
      </button>
    </li>
  )
}
