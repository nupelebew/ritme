/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { db } from './db/db'
import { loadAgenda } from './db/agenda'
import { setTaskDone } from './db/tasks'
import { toKey } from './lib/date'
import { AGENDA_TAG, showAgenda, type AgendaData } from './lib/agendaNotify'

declare const self: ServiceWorkerGlobalScope

// ---------- Offline: precache semua aset build ----------
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

// Mode "prompt": versi baru menunggu sampai pengguna menekan "Perbarui"
self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') void self.skipWaiting()
})

// ---------- Helpers ----------
async function refreshBadge(count: number) {
  const nav = self.navigator as WorkerNavigator & { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> }
  try {
    if (count > 0) await nav.setAppBadge?.(count)
    else await nav.clearAppBadge?.()
  } catch {
    /* tidak didukung */
  }
}

async function refreshAgenda(silent: boolean) {
  const agenda = await loadAgenda(db)
  await showAgenda(self.registration, agenda, { silent })
  await refreshBadge(agenda.badge)
}

/** Buka (atau fokuskan) Ritme di rute tertentu, mis. "#/fokus?mulai=ID" */
async function openApp(hash: string) {
  const url = new URL(`./${hash}`, self.registration.scope).href
  const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  const win = wins.find((w) => w.url.startsWith(self.registration.scope))
  if (win) {
    await win.focus()
    win.postMessage({ type: 'ritme:open', hash })
    return
  }
  await self.clients.openWindow(url)
}

// ---------- Tombol di notifikasi ----------
self.addEventListener('notificationclick', (e) => {
  const n = e.notification
  const data = n.data as AgendaData | undefined
  const work = (async () => {
    if (data?.kind === 'agenda') {
      if (e.action === 'done' && data.taskId) {
        const task = await db.tasks.get(data.taskId)
        if (task && !task.done) await setTaskDone(task, true)
        await refreshAgenda(true) // tampilkan tugas berikutnya
        return
      }
      n.close()
      if (e.action === 'focus' && data.taskId) return openApp(`#/fokus?mulai=${encodeURIComponent(data.taskId)}`)
      if (e.action === 'plan') return openApp('#/rencana')
      return openApp('#/')
    }
    n.close()
    return openApp('#/')
  })()
  e.waitUntil(work)
})

// ---------- Ringkasan pagi (Periodic Background Sync, Android/Chrome) ----------
const LAST_MORNING = 'swMorningAgenda'
self.addEventListener('periodicsync', (e: Event) => {
  const ev = e as ExtendableEvent & { tag: string }
  if (ev.tag !== AGENDA_TAG) return
  ev.waitUntil(
    (async () => {
      const now = new Date()
      const today = toKey(now)
      const last = (await db.settings.get(LAST_MORNING))?.value
      const morning = now.getHours() >= 5 && now.getHours() < 12
      const enabled = (await db.settings.get('notifications'))?.value === true && (await db.settings.get('agendaNotif'))?.value !== false
      if (!enabled) return
      // Pagi pertama hari itu: bunyikan. Selebihnya: perbarui diam-diam.
      const loud = morning && last !== today
      await refreshAgenda(!loud)
      if (loud) await db.settings.put({ key: LAST_MORNING, value: today })
    })(),
  )
})
