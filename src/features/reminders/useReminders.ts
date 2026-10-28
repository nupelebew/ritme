import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import { eventsForDate } from '@/db/events'
import { getSettings, useSettings } from '@/db/settings'
import type { DateKey } from '@/db/types'
import { nowMinutes, shiftKey, toKey, todayKey } from '@/lib/date'
import { canNotify, chime, showLocalNotification } from '@/lib/notify'
import { useToast } from '@/components/Toast'
import { dueReminders, plannedReminders, type PlannedReminder } from '@/lib/reminders'
import { clearNativeReminders, isNative, nativePermission, replaceNativeReminders, type NativePerm } from '@/lib/nativeNotify'
import { useNow } from '@/lib/useNow'

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

/** Izin notifikasi aplikasi Android (dibaca async, disimpan di sini supaya notifyStatus tetap sinkron) */
let nativePerm: NativePerm = 'default'
export async function refreshNativePermission() {
  if (isNative()) nativePerm = await nativePermission()
  return nativePerm
}
export function setNativePermission(p: NativePerm) {
  nativePerm = p
}

export function notifyStatus(): NotifyStatus {
  if (isNative()) return nativePerm
  return canNotify() ? (Notification.permission as NotifyStatus) : 'unsupported'
}

/** Notifikasi aktif = didukung, diizinkan, dan dinyalakan di pengaturan */
export function useNotificationsActive() {
  const s = useSettings()
  const [status, setStatus] = useState(notifyStatus)
  useEffect(() => {
    const onVis = () => void refreshNativePermission().then(() => setStatus(notifyStatus()))
    onVis()
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
 * Di aplikasi Android, notifikasi sistem diurus useNativeReminders; di sini tinggal bunyi & pesan di layar.
 */
export function useReminders() {
  const s = useSettings()
  useEffect(() => {
    let busy = false
    const run = async () => {
      if (busy) return
      const notify = s.notifications && notifyStatus() === 'granted' && !isNative()
      const visible = document.visibilityState === 'visible'
      // Tanpa izin notifikasi, pengingat tetap jalan selama Ritme terbuka (bunyi + pesan di layar)
      if (!notify && !visible) return
      busy = true
      try {
        const today = todayKey()
        const sent = loadSent(today)
        const due = dueReminders({
          today,
          nowMin: nowMinutes(),
          events: await eventsForDate(db, today),
          leadMin: s.eventReminderMin,
          atStart: s.blockAlerts,
          eveningHour: s.eveningReminderHour,
          tomorrowPlanned: await hasPlanFor(shiftKey(today, 1)),
          sent,
        })
        for (const r of due) {
          const alarm = r.kind === 'start'
          if (visible) {
            // Di layar: bunyi "ting" + pesan, supaya terasa walau notifikasi sistem disembunyikan
            if (r.kind !== 'evening') chime(alarm ? 'focus' : 'break')
            if (alarm) navigator.vibrate?.([200, 100, 200])
            window.dispatchEvent(new CustomEvent('ritme:reminder', { detail: r }))
          }
          if (notify) await showLocalNotification(r.title, r.body, r.id, { alarm })
          sent.add(r.id)
        }
        if (due.length) saveSent(today, sent)
      } finally {
        busy = false
      }
    }
    void run()
    // Cek tiap 20 detik supaya pergantian blok terasa tepat waktu
    const id = setInterval(run, 20_000)
    document.addEventListener('visibilitychange', run)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', run)
    }
  }, [s.notifications, s.eventReminderMin, s.eveningReminderHour, s.blockAlerts])
}

/** Berapa hari ke depan pengingat dipasang ke sistem; diperbarui lagi tiap Ritme dibuka */
const NATIVE_DAYS = 3

/**
 * Aplikasi Android: pasang semua pengingat beberapa hari ke depan sebagai alarm sistem,
 * jadi tetap muncul walau Ritme ditutup. Dipasang ulang otomatis setiap jadwal/pengaturan berubah.
 */
export function useNativeReminders() {
  const today = toKey(useNow(60_000))
  const plan = useLiveQuery(async () => {
    if (!isNative()) return null
    const s = await getSettings()
    if (!s.notifications) return { on: false as const }
    const list: PlannedReminder[] = []
    for (let d = 0; d < NATIVE_DAYS; d++) {
      const date = shiftKey(today, d)
      list.push(
        ...plannedReminders({
          today: date,
          events: await eventsForDate(db, date),
          leadMin: s.eventReminderMin,
          atStart: s.blockAlerts,
          eveningHour: s.eveningReminderHour,
          tomorrowPlanned: await hasPlanFor(shiftKey(date, 1)),
        }),
      )
    }
    return { on: true as const, list }
  }, [today])

  const [perm, setPerm] = useState<NativePerm>('default')
  useEffect(() => {
    if (!isNative()) return
    const onVis = () => void refreshNativePermission().then(setPerm)
    onVis()
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const key = plan ? JSON.stringify([perm, plan]) : ''
  useEffect(() => {
    if (!plan) return
    // Antre supaya pemasangan ulang tidak saling tumpang tindih
    queue = queue
      .then(async () => {
        if (plan.on && perm === 'granted') await replaceNativeReminders(plan.list)
        else await clearNativeReminders()
      })
      .catch(() => undefined)
  }, [key])
}
let queue: Promise<void> = Promise.resolve()

/** Dipasang di dalam ToastProvider: tampilkan pengingat sebagai pesan di layar saat Ritme terbuka */
export function ReminderToasts() {
  const toast = useToast()
  useEffect(() => {
    const on = (e: Event) => {
      const r = (e as CustomEvent<{ title: string; body: string }>).detail
      toast({ text: `🔔 ${r.title} — ${r.body}` })
    }
    window.addEventListener('ritme:reminder', on)
    return () => window.removeEventListener('ritme:reminder', on)
  }, [toast])
  return null
}
