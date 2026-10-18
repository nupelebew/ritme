import type { Agenda } from './agenda'

export const AGENDA_TAG = 'ritme-agenda'

/** Data yang dibawa notifikasi agar service worker tahu harus berbuat apa saat tombol ditekan */
export interface AgendaData {
  kind: 'agenda'
  taskId?: string
  categoryId?: string
}

/** Tampilkan / perbarui notifikasi "Agenda hari ini" (satu notifikasi, diganti di tempat lewat tag) */
export function showAgenda(reg: ServiceWorkerRegistration, a: Agenda, opts: { silent: boolean }) {
  const actions = a.topTask
    ? [
        { action: 'done', title: '✓ Selesai' },
        { action: 'focus', title: '⏱ Mulai fokus' },
      ]
    : [{ action: 'plan', title: 'Susun jadwal' }]
  const data: AgendaData = { kind: 'agenda', taskId: a.topTask?.id, categoryId: a.topTask?.categoryId }
  return reg.showNotification(a.title, {
    body: a.body,
    tag: AGENDA_TAG,
    silent: opts.silent,
    icon: new URL('pwa-192x192.png', reg.scope).href,
    badge: new URL('pwa-64x64.png', reg.scope).href,
    data,
    // `actions` & `renotify` belum ada di tipe TS standar
    ...({ actions, renotify: !opts.silent } as object),
  })
}
