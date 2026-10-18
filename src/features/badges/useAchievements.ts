import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import { useCategories } from '@/db/hooks'
import { setSetting } from '@/db/settings'
import { badgesOf, levelOf, xpOf, type AchievementData } from '@/lib/achievements'
import { confetti } from '@/lib/confetti'
import { todayKey } from '@/lib/date'
import { longestStreak } from '@/lib/habits'
import { matchCategory } from '@/lib/plan/schema'
import { useToast } from '@/components/Toast'

export async function loadAchievementData(coupleCategory?: string): Promise<AchievementData> {
  const today = todayKey()
  const [sessions, tasks, habitLogs, habits, milestones, invoices, events, days] = await Promise.all([
    db.sessions.toArray(),
    db.tasks.toArray(),
    db.habitLogs.toArray(),
    db.habits.toArray(),
    db.milestones.toArray(),
    db.invoices.toArray(),
    db.events.toArray(),
    db.days.toArray(),
  ])
  let best = 0
  for (const h of habits) best = Math.max(best, longestStreak(h, new Set(habitLogs.filter((l) => l.habitId === h.id).map((l) => l.date)), today))
  return { sessions, tasks, habitLogs, bestHabitStreak: best, milestones, invoices, events, days, coupleCategory }
}

export function useAchievements() {
  const { list } = useCategories()
  const couple = matchCategory('Pasangan', list)?.id
  return useLiveQuery(async () => {
    const d = await loadAchievementData(couple)
    const xp = xpOf(d)
    return { level: levelOf(xp), badges: badgesOf(d) }
  }, [couple])
}

/** Dipasang di dalam ToastProvider: rayakan lencana yang baru terbuka */
export function BadgeWatcher() {
  // undefined = masih memuat; null = belum pernah tersimpan
  const row = useLiveQuery(async () => (await db.settings.get('unlockedBadges')) ?? null, [])
  const data = useAchievements()
  const toast = useToast()
  useEffect(() => {
    if (!data || row === undefined) return
    const saved = (row?.value as string[] | undefined) ?? []
    const known = new Set(saved)
    const fresh = data.badges.filter((b) => b.unlocked && !known.has(b.id))
    if (!fresh.length) return
    void setSetting('unlockedBadges', data.badges.filter((b) => b.unlocked).map((b) => b.id))
    // Pertama kali fitur ini aktif: catat diam-diam lencana yang sudah ada, jangan banjiri toast
    if (row === null) return
    for (const b of fresh) toast({ text: `${b.emoji} Lencana baru: ${b.name}!`, tone: 'success' })
    confetti()
  }, [data, row, toast])
  return null
}
