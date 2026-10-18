import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import { loadAgenda } from '@/db/agenda'
import { useSettings } from '@/db/settings'
import { AGENDA_TAG, showAgenda } from '@/lib/agendaNotify'
import { useNow } from '@/lib/useNow'
import { notifyStatus } from './useReminders'

type BadgeNav = Navigator & { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> }
type PeriodicReg = ServiceWorkerRegistration & {
  periodicSync?: { register: (tag: string, o: { minInterval: number }) => Promise<void>; unregister: (tag: string) => Promise<void> }
}

let lastShown = ''

/**
 * Dipasang sekali di App:
 * - notifikasi "Agenda hari ini" yang menetap & diperbarui saat data/waktu berubah
 * - angka di ikon aplikasi (badge)
 * - mendaftarkan ringkasan pagi (Periodic Background Sync, bila didukung)
 * - membuka rute yang diminta tombol notifikasi
 */
export function useAgenda() {
  const s = useSettings()
  const navigate = useNavigate()
  const minute = useNow(60_000)
  const agenda = useLiveQuery(() => loadAgenda(db), [minute.getHours(), minute.getMinutes()])

  // Badge ikon
  useEffect(() => {
    if (!agenda) return
    const nav = navigator as BadgeNav
    try {
      if (s.badge && agenda.badge > 0) void nav.setAppBadge?.(agenda.badge)?.catch(() => {})
      else void nav.clearAppBadge?.()?.catch(() => {})
    } catch {
      /* tidak didukung */
    }
  }, [agenda, s.badge])

  // Notifikasi agenda menetap
  const enabled = s.notifications && s.agendaNotif
  useEffect(() => {
    if (!agenda || !enabled || notifyStatus() !== 'granted') return
    const key = JSON.stringify([agenda.title, agenda.body, agenda.topTask?.id])
    if (key === lastShown) return
    const id = setTimeout(async () => {
      const reg = await navigator.serviceWorker?.getRegistration()
      if (!reg) return
      await showAgenda(reg, agenda, { silent: true })
      lastShown = key
    }, 800)
    return () => clearTimeout(id)
  }, [agenda, enabled])

  // Matikan: hapus notifikasi agenda yang masih tampil
  useEffect(() => {
    if (enabled) return
    lastShown = ''
    void navigator.serviceWorker?.getRegistration().then((reg) =>
      reg?.getNotifications({ tag: AGENDA_TAG }).then((ns) => ns.forEach((n) => n.close())),
    )
  }, [enabled])

  // Ringkasan pagi di latar (Android/Chrome, aplikasi terpasang)
  useEffect(() => {
    void (async () => {
      const reg = (await navigator.serviceWorker?.getRegistration()) as PeriodicReg | undefined
      if (!reg?.periodicSync) return
      try {
        if (enabled && notifyStatus() === 'granted') {
          const perm = await navigator.permissions.query({ name: 'periodic-background-sync' as PermissionName })
          if (perm.state === 'granted') await reg.periodicSync.register(AGENDA_TAG, { minInterval: 6 * 60 * 60 * 1000 })
        } else await reg.periodicSync.unregister(AGENDA_TAG)
      } catch {
        /* tidak didukung / ditolak */
      }
    })()
  }, [enabled])

  // Tombol notifikasi minta membuka rute tertentu
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === 'ritme:open' && typeof e.data.hash === 'string') navigate(e.data.hash.replace(/^#/, ''))
    }
    navigator.serviceWorker?.addEventListener('message', onMsg)
    return () => navigator.serviceWorker?.removeEventListener('message', onMsg)
  }, [navigate])
}

export async function periodicSyncSupported() {
  const reg = (await navigator.serviceWorker?.getRegistration()) as PeriodicReg | undefined
  return !!reg?.periodicSync
}
