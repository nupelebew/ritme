import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Fingerprint, Lock } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import { lockFlag, markUnlocked, unlockedRecently, verifyLock } from '@/lib/appLock'

/** Tirai privasi: menutupi aplikasi sampai sidik jari / wajah / PIN layar terverifikasi */
export function LockScreen() {
  const row = useLiveQuery(async () => (await db.settings.get('appLock')) ?? null, [])
  const id = (row?.value as string | undefined) ?? ''
  // Pakai penanda sinkron supaya tirai tampil sejak render pertama (sebelum database termuat)
  const [locked, setLocked] = useState(() => lockFlag.get() && !unlockedRecently())
  const [error, setError] = useState('')

  // Database bilang kunci mati → hapus tirai & penanda
  useEffect(() => {
    if (row !== undefined && !id) {
      lockFlag.set(false)
      setLocked(false)
    }
  }, [row, id])

  // Kunci lagi bila aplikasi disembunyikan > 2 menit
  useEffect(() => {
    let hiddenAt = 0
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now()
        if (!locked) markUnlocked()
      } else if (lockFlag.get() && hiddenAt && !unlockedRecently()) setLocked(true)
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [locked])

  if (!locked) return null

  const unlock = async () => {
    setError('')
    if (!id) return // masih memuat
    try {
      if (await verifyLock(id)) {
        markUnlocked()
        setLocked(false)
      }
    } catch {
      setError('Belum berhasil. Coba lagi — bisa juga pakai PIN/pola layar HP.')
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] grid place-items-center bg-bg/95 p-6 backdrop-blur-2xl" role="dialog" aria-modal="true" aria-label="Ritme terkunci">
      <div className="w-full max-w-xs text-center">
        <div className="mx-auto mb-4 grid size-20 place-items-center rounded-3xl glass">
          <Lock className="size-9 text-accent" aria-hidden />
        </div>
        <h1 className="font-display text-2xl font-semibold">Ritme terkunci</h1>
        <p className="mt-1 text-sm text-muted">Buka dengan sidik jari, wajah, atau PIN layar HP.</p>
        <button
          type="button"
          autoFocus
          onClick={unlock}
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(110deg,var(--accent),var(--accent-2))] font-semibold text-on-accent"
        >
          <Fingerprint className="size-5" aria-hidden /> Buka kunci
        </button>
        {error && (
          <p className="mt-3 text-sm text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>,
    document.body,
  )
}
