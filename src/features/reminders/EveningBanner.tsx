import { useState } from 'react'
import { Link } from 'react-router'
import { MoonStar, X } from 'lucide-react'
import { IconButton } from '@/components/ui'
import { useSettings } from '@/db/settings'
import { nowMinutes, todayKey } from '@/lib/date'
import { showEveningBanner } from '@/lib/reminders'
import { useNow } from '@/lib/useNow'
import { useNotificationsActive, useTomorrowPlanned } from './useReminders'

const KEY = 'ritme-banner-dismissed'

/** Cadangan pengingat: muncul saat Ritme dibuka malam hari dan besok belum direncanakan */
export function EveningBanner() {
  const s = useSettings()
  const now = useNow(60_000)
  const planned = useTomorrowPlanned()
  const { active } = useNotificationsActive()
  const today = todayKey()
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(KEY) === today
    } catch {
      return false
    }
  })
  if (planned === undefined || active || !showEveningBanner(nowMinutes(now), s.eveningReminderHour, planned, dismissed)) return null

  return (
    <div className="relative overflow-hidden rounded-3xl border border-accent/40 bg-[linear-gradient(120deg,color-mix(in_srgb,var(--accent)_22%,transparent),color-mix(in_srgb,var(--accent-2)_12%,transparent))] p-4 animate-rise" role="status">
      <div className="flex items-start gap-3 pr-8">
        <MoonStar className="mt-0.5 size-6 shrink-0 text-accent" aria-hidden />
        <div>
          <p className="font-semibold">Malam{s.name ? `, ${s.name}` : ''}! Besok belum ada rencana.</p>
          <p className="mt-0.5 text-[13px] text-muted">5 menit brain dump sekarang bikin besok lebih ringan.</p>
          <Link
            to="/rencana"
            className="mt-3 inline-flex min-h-11 items-center rounded-2xl bg-[linear-gradient(110deg,var(--accent),var(--accent-2))] px-4 text-sm font-semibold text-on-accent"
          >
            Susun rencana besok
          </Link>
        </div>
      </div>
      <IconButton
        icon={X}
        label="Tutup pengingat untuk hari ini"
        className="absolute right-1 top-1"
        onClick={() => {
          try {
            localStorage.setItem(KEY, today)
          } catch {
            /* abaikan */
          }
          setDismissed(true)
        }}
      />
    </div>
  )
}
