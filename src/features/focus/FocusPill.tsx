import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router'
import { Pause, Play } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import { useNow } from '@/lib/useNow'
import { focusStore, mmss, PHASE_LABEL, useFocusState } from './focus'

/** Pil timer kecil yang muncul di halaman lain saat timer berjalan/dijeda */
export function FocusPill() {
  const s = useFocusState()
  const { pathname } = useLocation()
  useNow(1000)
  const task = useLiveQuery(() => (s.taskId ? db.tasks.get(s.taskId) : undefined), [s.taskId])
  if (s.status === 'idle' || pathname === '/fokus') return null
  const isFocus = s.phase === 'focus'
  const running = s.status === 'running'

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-3 pt-safe">
      <div className="glass-strong pointer-events-auto flex items-center gap-1 rounded-full py-1 pl-1 pr-1 animate-rise">
        <Link to="/fokus" className="flex min-h-11 items-center gap-2 rounded-full pl-3 pr-2" aria-label="Buka halaman fokus">
          <span
            className="size-2.5 rounded-full"
            style={{ background: isFocus ? 'var(--accent)' : 'var(--accent-3)', boxShadow: running ? `0 0 10px ${isFocus ? 'var(--accent)' : 'var(--accent-3)'}` : undefined }}
            aria-hidden
          />
          <span className="font-display text-base font-semibold tabular-nums">{mmss(focusStore.remaining())}</span>
          <span className="max-w-[140px] truncate text-xs text-muted">{task?.title ?? PHASE_LABEL[s.phase]}</span>
        </Link>
        <button
          type="button"
          onClick={() => (running ? focusStore.pause() : focusStore.start())}
          aria-label={running ? 'Jeda timer' : 'Lanjutkan timer'}
          className="grid size-11 place-items-center rounded-full bg-white/8 hover:bg-white/12"
        >
          {running ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
        </button>
      </div>
    </div>,
    document.body,
  )
}
