let ctx: AudioContext | undefined

/** AudioContext bersama (bunyi notifikasi & suara latar) */
export function audioContext() {
  ctx ??= new AudioContext()
  return ctx
}

/** Panggil dari aksi pengguna (mis. tombol Mulai) supaya browser mengizinkan suara nanti */
export function unlockAudio() {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    /* tidak didukung */
  }
}

/** Bunyi "ting" lembut tiga nada, dibuat dengan WebAudio (tanpa file audio) */
export function chime(kind: 'focus' | 'break' = 'focus') {
  try {
    ctx ??= new AudioContext()
    const notes = kind === 'focus' ? [660, 880, 1320] : [880, 660, 520]
    const t0 = ctx.currentTime + 0.02
    notes.forEach((f, i) => {
      const o = ctx!.createOscillator()
      const g = ctx!.createGain()
      o.type = 'sine'
      o.frequency.value = f
      const t = t0 + i * 0.16
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.18, t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9)
      o.connect(g).connect(ctx!.destination)
      o.start(t)
      o.stop(t + 1)
    })
  } catch {
    /* abaikan */
  }
}

export const canNotify = () => typeof Notification !== 'undefined'

/** Notifikasi lokal lewat service worker (lebih andal di Android), cadangan: Notification biasa */
export async function showLocalNotification(title: string, body: string, tag = 'ritme', opts: { alarm?: boolean } = {}) {
  if (!canNotify() || Notification.permission !== 'granted') return false
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) {
      await reg.showNotification(title, {
        body,
        tag,
        icon: 'pwa-192x192.png',
        badge: 'pwa-64x64.png',
        // Alarm kecil: getar & tetap tampil sampai diketuk (bila didukung)
        ...(opts.alarm ? ({ vibrate: [250, 120, 250, 120, 400], requireInteraction: true, renotify: true } as object) : {}),
      })
      return true
    }
    new Notification(title, { body, tag, icon: 'pwa-192x192.png' })
    return true
  } catch {
    return false
  }
}
