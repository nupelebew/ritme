import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { useToast } from '@/components/Toast'
import { db } from '@/db/db'
import { setTaskDone } from '@/db/tasks'
import type { Task } from '@/db/types'
import { todayKey } from '@/lib/date'
import { rankTasks } from '@/lib/priority'
import { confetti } from '@/lib/confetti'

export function useTasks() {
  const tasks = useLiveQuery(() => db.tasks.toArray(), [])
  const today = todayKey()
  return useMemo(() => {
    const all = tasks ?? []
    const ranked = rankTasks(all, today)
    const startOfToday = new Date(today + 'T00:00:00').getTime()
    const doneToday = all.filter((t) => t.done && (t.doneAt ?? 0) >= startOfToday).length
    return { ready: !!tasks, all, ranked, doneToday, today }
  }, [tasks, today])
}

/** Centang/batal centang dengan toast urungkan */
export function useToggleTask() {
  const toast = useToast()
  return async (t: Task) => {
    const undo = await setTaskDone(t, !t.done)
    if (!t.done) {
      navigator.vibrate?.(12)
      // Rayakan sekali sehari saat 3 tugas sudah beres
      const today = todayKey()
      const start = new Date(today + 'T00:00:00').getTime()
      const doneToday = await db.tasks.where('doneAt').aboveOrEqual(start).count()
      let celebrated = false
      try {
        celebrated = localStorage.getItem('ritme-confetti') === today
        if (doneToday >= 3 && !celebrated) localStorage.setItem('ritme-confetti', today)
      } catch {
        /* abaikan */
      }
      if (doneToday >= 3 && !celebrated) {
        confetti()
        toast({ text: '🎉 3 tugas beres hari ini! Sisanya bonus.', tone: 'success', action: { label: 'Urungkan', run: undo } })
      } else toast({ text: `Mantap! "${t.title}" selesai.`, tone: 'success', action: { label: 'Urungkan', run: undo } })
    }
  }
}
