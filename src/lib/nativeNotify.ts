import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { fromKey } from './date'
import type { PlannedReminder } from './reminders'

/** Berjalan sebagai aplikasi Android (Capacitor), bukan PWA di browser */
export const isNative = () => Capacitor.isNativePlatform()

const CH_ALARM = 'ritme-alarm'
const CH_REMINDER = 'ritme-reminder'
/** Batas aman jumlah alarm yang dipasang (Android membatasi ±500 per aplikasi) */
const MAX_SCHEDULED = 200

let channelsReady: Promise<void> | undefined
function ensureChannels() {
  channelsReady ??= (async () => {
    try {
      await LocalNotifications.createChannel({ id: CH_ALARM, name: 'Kegiatan mulai', description: 'Bunyi & getar tiap pergantian blok jadwal', importance: 5, vibration: true, visibility: 1 })
      await LocalNotifications.createChannel({ id: CH_REMINDER, name: 'Pengingat', description: 'Kegiatan sebentar lagi & rencana besok', importance: 4, vibration: true, visibility: 1 })
    } catch {
      /* kanal hanya ada di Android 8+ */
    }
  })()
  return channelsReady
}

export type NativePerm = 'default' | 'denied' | 'granted'
const toPerm = (s: string): NativePerm => (s === 'granted' ? 'granted' : s === 'denied' ? 'denied' : 'default')

export async function nativePermission(): Promise<NativePerm> {
  try {
    return toPerm((await LocalNotifications.checkPermissions()).display)
  } catch {
    return 'denied'
  }
}

export async function requestNativePermission(): Promise<NativePerm> {
  try {
    return toPerm((await LocalNotifications.requestPermissions()).display)
  } catch {
    return 'denied'
  }
}

/** Izin "Alarm & pengingat" (Android 12+): tanpa ini notifikasi bisa telat beberapa menit */
export async function exactAlarmAllowed() {
  try {
    return (await LocalNotifications.checkExactNotificationSetting()).exact_alarm === 'granted'
  } catch {
    return true
  }
}
export async function openExactAlarmSetting() {
  try {
    await LocalNotifications.changeExactNotificationSetting()
  } catch {
    /* tidak didukung */
  }
}

/** Id notifikasi Android harus bilangan bulat 32-bit; turunkan dari id pengingat */
export function numericId(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) + id.charCodeAt(i)) | 0
  return (h & 0x7fffffff) || 1
}

export async function showNativeNow(title: string, body: string) {
  await ensureChannels()
  await LocalNotifications.schedule({
    notifications: [{ id: numericId(`now:${Date.now()}`), title, body, channelId: CH_REMINDER, schedule: { at: new Date(Date.now() + 1000), allowWhileIdle: true } }],
  })
}

/**
 * Ganti semua pengingat terjadwal dengan daftar baru. Alarm dipegang sistem Android,
 * jadi tetap berbunyi walau Ritme ditutup (dan dipasang ulang otomatis setelah HP restart).
 */
export async function replaceNativeReminders(list: PlannedReminder[]) {
  await ensureChannels()
  const pending = await LocalNotifications.getPending()
  if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) })

  const now = Date.now()
  const notifications = list
    .map((r) => {
      const at = fromKey(r.date)
      at.setMinutes(r.atMin)
      return { r, at }
    })
    .filter(({ at }) => at.getTime() > now + 5_000)
    .slice(0, MAX_SCHEDULED)
    .map(({ r, at }) => ({
      id: numericId(r.id),
      title: r.title,
      body: r.body,
      channelId: r.kind === 'start' ? CH_ALARM : CH_REMINDER,
      schedule: { at, allowWhileIdle: true },
      extra: { reminderId: r.id },
    }))
  if (notifications.length) await LocalNotifications.schedule({ notifications })
  return notifications.length
}

export async function clearNativeReminders() {
  const pending = await LocalNotifications.getPending()
  if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) })
}
