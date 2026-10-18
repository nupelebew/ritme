import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import { eventsForDate } from '@/db/events'
import { useSettings } from '@/db/settings'
import type { DateKey } from '@/db/types'
import { nowMinutes, shiftKey, todayKey } from '@/lib/date'
import { canNotify, showLocalNotification } from '@/lib/notify'
import { dueReminders } from '@/lib/reminders'

const SENT_KEY = 'ritme-sent'

/** "Sudah direncanakan" = ada minimal satu kegiatan sekali-jalan (bukan hanya jadwal berulang) */
export async function hasPlanFor(date: DateKey) {
  return (await db.events.where('date').equals(date).filter((e) => !e.recurrence).count()) > 0
}

export function useTomorrowPlanned() {
  const today = todayKey()
  return useLiveQuery(() => hasPlanFor(shiftKey(today, 1)), [today])
}

export type NotifyStatus = 'unsupported' | 'default' | 'denied' | 'granted'
export function notifyStatus(): NotifyStatus {
  return canNotify() ? (Notification.permission as NotifyStatus) : 'unsupported'
}

/** Notifikasi aktif = didukung, diizinkan, dan dinyalakan di pengaturan */
export function useNotificationsActive() {
  const s = useSettings()
  const [status, setStatus] = useState(notifyStatus)
  useEffect(() => {
    const onVis = () => setStatus(notifyStatus())
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])
  return { active: s.notifications && status === 'granted', status, refresh: () => setStatus(notifyStatus()) }
}

function loadSent(today: DateKey): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(SENT_KEY) ?? '{}') as { date?: string; ids?: string[] }
    return new Set(raw.date === today ? raw.ids : [])
  } catch {
    return new Set()
  }
}
function saveSent(today: DateKey, sent: Set<string>) {
  try {
    localStorage.setItem(SENT_KEY, JSON.stringify({ date: today, ids: [...sent] }))
  } catch {
    /* abaikan */
  }
}

/**
 * Penjadwal pengingat lokal. Dipasang sekali di App.
 * Catatan: PWA tanpa server push hanya bisa memberi notifikasi selama aplikasi masih hidup
 * (terbuka atau di latar belakang). Saat ditutup total, banner malam jadi cadangannya.
 */
export function useReminders() {
  const s = useSettings()
  useEffect(() => {
    if (!s.notifications) return
    let busy = false
    const run = async () => {
      if (busy || notifyStatus() !== 'granted') return
      busy = true
      try {
        const today = todayKey()
        const sent = loadSent(today)
        const due = dueReminders({
          today,
          nowMin: nowMinutes(),
          events: await eventsForDate(db, today),
          leadMin: s.eventReminderMin,
          eveningHour: s.eveningReminderHour,
          tomorrowPlanned: await hasPlanFor(shiftKey(today, 1)),
          sent,
        })
        for (const r of due) {
          await showLocalNotification(r.title, r.body, r.id)
          sent.add(r.id)
        }
        if (due.length) saveSent(today, sent)
      } finally {
        busy = false
      }
    }
    void run()
    const id = setInterval(run, 30_000)
    document.addEventListener('visibilitychange', run)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', run)
    }
  }, [s.notifications, s.eventReminderMin, s.eveningReminderHour])
}
