import { useEffect, useRef, useSyncExternalStore } from 'react'
import { db, uid } from '@/db/db'
import { DEFAULT_SETTINGS, useSettings } from '@/db/settings'
import { toKey } from '@/lib/date'
import { createFocusStore, type Phase } from '@/lib/focusStore'
import { chime, showLocalNotification } from '@/lib/notify'
import { playNoise, stopNoise } from '@/lib/noise'

const storage = typeof localStorage !== 'undefined' ? localStorage : undefined

export const PHASE_LABEL: Record<Phase, string> = { focus: 'Fokus', short: 'Istirahat', long: 'Istirahat panjang' }

export const focusStore = createFocusStore(
  DEFAULT_SETTINGS,
  {
    onLog: (s) => {
      void db.sessions.add({
        id: uid(),
        start: s.start,
        end: s.end,
        durationMin: Math.max(1, Math.round(s.durationMs / 60_000)),
        date: toKey(new Date(s.start)),
        taskId: s.taskId,
        categoryId: s.categoryId,
        completed: s.completed,
      })
    },
    onPhaseEnd: (phase, next, fresh) => {
      if (!fresh) return
      chime(phase === 'focus' ? 'focus' : 'break')
      navigator.vibrate?.([120, 80, 120])
      if (document.visibilityState !== 'visible')
        void showLocalNotification(
          phase === 'focus' ? 'Sesi fokus selesai 🎉' : 'Istirahat selesai',
          phase === 'focus' ? `Waktunya ${PHASE_LABEL[next].toLowerCase()}. Regangkan badan dulu.` : 'Siap lanjut fokus?',
          'ritme-focus',
        )
    },
  },
  { storage },
)

export function useFocusState() {
  return useSyncExternalStore(focusStore.subscribe, focusStore.get)
}

/** Dipasang sekali di App: sinkronkan durasi dari pengaturan dan jalankan detak timer */
export function useFocusEngine() {
  const s = useSettings()
  useEffect(() => {
    focusStore.configure({
      focusMin: s.focusMin,
      shortBreakMin: s.shortBreakMin,
      longBreakMin: s.longBreakMin,
      longBreakEvery: s.longBreakEvery,
    })
  }, [s.focusMin, s.shortBreakMin, s.longBreakMin, s.longBreakEvery])

  // Layar tetap menyala saat timer berjalan (dilepas otomatis oleh browser saat tab disembunyikan)
  const { status } = useFocusState()
  useEffect(() => {
    const wl = (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock
    if (!wl || !s.keepAwake || status !== 'running') return
    let lock: { release: () => Promise<void> } | undefined
    let alive = true
    const acquire = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        lock = await wl.request('screen')
        if (!alive) void lock.release()
      } catch {
        /* ditolak, mis. mode hemat baterai */
      }
    }
    void acquire()
    document.addEventListener('visibilitychange', acquire)
    return () => {
      alive = false
      document.removeEventListener('visibilitychange', acquire)
      void lock?.release().catch(() => {})
    }
  }, [s.keepAwake, status])

  // Suara latar hanya saat fase fokus berjalan
  const { phase } = useFocusState()
  useEffect(() => {
    if (status === 'running' && phase === 'focus' && s.noise !== 'off') playNoise(s.noise)
    else stopNoise()
  }, [status, phase, s.noise])
  useEffect(() => () => stopNoise(), [])

  // Istirahat mata 20-20-20: tiap 20 menit fokus, lihat ±6 meter selama 20 detik
  const eyeIdx = useRef<{ start?: number; idx: number }>({ idx: 0 })
  useEffect(() => {
    if (!s.eyeBreak) return
    const id = setInterval(() => {
      const st = focusStore.get()
      if (st.status !== 'running' || st.phase !== 'focus' || !st.startedAt) return
      if (eyeIdx.current.start !== st.startedAt) eyeIdx.current = { start: st.startedAt, idx: 0 }
      const elapsed = st.durationMs - focusStore.remaining()
      const idx = Math.floor(elapsed / (20 * 60_000))
      // jangan bertabrakan dengan akhir sesi (sisa < 2 menit)
      if (idx > eyeIdx.current.idx && focusStore.remaining() > 2 * 60_000) {
        eyeIdx.current.idx = idx
        chime('break')
        navigator.vibrate?.([60, 60, 60])
        window.dispatchEvent(new CustomEvent('ritme:eyebreak'))
        if (document.visibilityState !== 'visible') void showLocalNotification('Istirahat mata 👀', 'Lihat sesuatu sejauh ±6 meter selama 20 detik.', 'ritme-eye')
      }
    }, 10_000)
    return () => clearInterval(id)
  }, [s.eyeBreak])

  useEffect(() => {
    focusStore.tick()
    const id = setInterval(() => focusStore.tick(), 500)
    const onVis = () => focusStore.tick()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])
}

export const mmss = (ms: number) => {
  const total = Math.ceil(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
