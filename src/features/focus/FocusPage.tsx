import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, Minus, Pause, Play, Plus, RotateCcw, Settings2, SkipForward, Target, Timer, Trash2 } from 'lucide-react'
import { Button, Card, Chip, IconButton, PageHeader, Sheet } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { db } from '@/db/db'
import { FALLBACK_CATEGORY, useCategories } from '@/db/hooks'
import { setSetting, useSettings, type Settings } from '@/db/settings'
import { durationLabel, fmt, minToHHMM, nowMinutes, todayKey } from '@/lib/date'
import type { Phase } from '@/lib/focusStore'
import { iconFor } from '@/lib/icons'
import { unlockAudio } from '@/lib/notify'
import { useNow } from '@/lib/useNow'
import { cn } from '@/lib/cn'
import { useTasks } from '@/features/tasks/useTasks'
import { focusStore, mmss, PHASE_LABEL, useFocusState } from './focus'
import { FocusRing } from './FocusRing'
import { totalMin, useSessionsOn } from './useSessions'

export function FocusPage() {
  const s = useFocusState()
  const settings = useSettings()
  const { map: categories } = useCategories()
  const today = todayKey()
  const sessions = useSessionsOn(today) ?? []
  const toast = useToast()
  useNow(s.status === 'running' ? 250 : 30_000)
  const [picker, setPicker] = useState(false)
  const [config, setConfig] = useState(false)

  // Dari tombol notifikasi / pintasan ikon: ?mulai=<idTugas> atau ?mulai=1
  const [params, setParams] = useSearchParams()
  const mulai = params.get('mulai')
  useEffect(() => {
    if (!mulai) return
    void (async () => {
      const t = mulai !== '1' ? await db.tasks.get(mulai) : undefined
      const st = focusStore.get()
      if (t && st.status === 'idle') focusStore.setTarget({ taskId: t.id, categoryId: t.categoryId })
      if (st.status === 'idle' && st.phase !== 'focus') focusStore.setPhase('focus')
      if (focusStore.get().status !== 'running') focusStore.start()
      toast({ text: t ? `Fokus dimulai: ${t.title}` : 'Fokus dimulai.', tone: 'success' })
      setParams({}, { replace: true })
    })()
    // hanya bereaksi saat parameter `mulai` muncul
  }, [mulai])

  const task = useLiveQuery(() => (s.taskId ? db.tasks.get(s.taskId) : undefined), [s.taskId])
  const cat = categories.get(task?.categoryId ?? s.categoryId ?? '')
  const remaining = focusStore.remaining()
  const progress = 1 - remaining / s.durationMs
  const running = s.status === 'running'
  const isFocus = s.phase === 'focus'
  const idle = s.status === 'idle'

  const primary = () => {
    unlockAudio()
    if (running) focusStore.pause()
    else focusStore.start()
  }

  const minutes = totalMin(sessions)
  const byCat = new Map<string, number>()
  for (const x of sessions) byCat.set(x.categoryId ?? '?', (byCat.get(x.categoryId ?? '?') ?? 0) + x.durationMin)

  return (
    <div className="animate-rise space-y-5">
      <PageHeader
        eyebrow={minutes ? `${durationLabel(minutes)} fokus hari ini` : 'Satu hal, satu waktu'}
        title="Fokus"
        action={<IconButton icon={Settings2} label="Atur durasi timer" onClick={() => setConfig(true)} />}
      />

      <div role="radiogroup" aria-label="Jenis sesi" className="glass mx-auto flex w-fit rounded-2xl p-1">
        {(['focus', 'short', 'long'] as Phase[]).map((p) => (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={s.phase === p}
            disabled={!idle && s.phase !== p}
            onClick={() => focusStore.setPhase(p)}
            className={cn(
              'min-h-10 rounded-xl px-3 text-[13px] transition disabled:opacity-35',
              s.phase === p ? 'bg-white/12 font-semibold text-ink' : 'text-muted',
            )}
          >
            {p === 'focus' ? `Fokus ${settings.focusMin}` : p === 'short' ? `Rehat ${settings.shortBreakMin}` : `Rehat ${settings.longBreakMin}`}
          </button>
        ))}
      </div>

      <FocusRing progress={idle ? 0 : progress} running={running} tone={isFocus ? 'focus' : 'break'}>
        <div>
          <p className={cn('text-xs font-semibold uppercase tracking-[0.2em]', isFocus ? 'text-accent' : 'text-accent-3')}>
            {s.status === 'paused' ? 'Dijeda' : PHASE_LABEL[s.phase]}
          </p>
          <p className="font-display text-[clamp(44px,14vw,60px)] font-semibold leading-none tabular-nums tracking-tight" role="timer" aria-live="off">
            {mmss(remaining)}
          </p>
          <div className="mt-2 flex justify-center gap-1.5" aria-label={`Sesi ${s.cycle} dari ${settings.longBreakEvery} sebelum istirahat panjang`}>
            {Array.from({ length: settings.longBreakEvery }, (_, i) => (
              <span key={i} className={cn('size-1.5 rounded-full', i < s.cycle ? 'bg-accent-2' : 'bg-white/15')} />
            ))}
          </div>
        </div>
      </FocusRing>

      <div className="flex items-center justify-center gap-5">
        <IconButton
          icon={RotateCcw}
          label={idle ? 'Atur ulang' : 'Hentikan dan catat'}
          className="glass size-14 rounded-full"
          disabled={idle}
          onClick={() => {
            focusStore.stop()
            toast({ text: isFocus ? 'Sesi dihentikan. Fokus ≥ 1 menit tetap tercatat.' : 'Istirahat dihentikan.' })
          }}
        />
        <button
          type="button"
          onClick={primary}
          className="grid size-20 place-items-center rounded-full bg-[linear-gradient(140deg,var(--accent),var(--accent-2))] text-on-accent shadow-[0_12px_40px_-10px_var(--accent)] transition active:scale-95"
          aria-label={running ? 'Jeda' : s.status === 'paused' ? 'Lanjutkan' : `Mulai ${PHASE_LABEL[s.phase].toLowerCase()}`}
        >
          {running ? <Pause className="size-8" fill="currentColor" aria-hidden /> : <Play className="ml-1 size-8" fill="currentColor" aria-hidden />}
        </button>
        <IconButton icon={SkipForward} label="Lewati ke sesi berikutnya" className="glass size-14 rounded-full" onClick={() => focusStore.skip()} />
      </div>
      <p className="-mt-2 text-center text-sm font-medium text-muted">
        {running ? 'Jeda' : s.status === 'paused' ? 'Lanjutkan' : `Mulai ${PHASE_LABEL[s.phase].toLowerCase()}`}
      </p>

      {/* Target sesi */}
      <button type="button" onClick={() => setPicker(true)} className="glass flex w-full items-center gap-3 rounded-3xl p-3 text-left transition hover:bg-white/5">
        <span
          className="grid size-11 shrink-0 place-items-center rounded-2xl"
          style={{ background: `color-mix(in srgb, ${cat?.color ?? 'var(--accent)'} 20%, transparent)`, color: cat?.color ?? 'var(--accent)' }}
        >
          <Target className="size-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-muted">Sedang mengerjakan</span>
          <span className="block truncate font-semibold">{task?.title ?? cat?.name ?? 'Pilih tugas atau kategori'}</span>
        </span>
        <ChevronRight className="size-5 text-faint" aria-hidden />
      </button>

      {/* Sesi hari ini */}
      <Card className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display font-semibold">Sesi hari ini</h2>
          <span className="text-sm text-muted">
            {sessions.length} sesi · {durationLabel(minutes)}
          </span>
        </div>
        {sessions.length === 0 ? (
          <p className="flex items-center gap-2 py-2 text-sm text-muted">
            <Timer className="size-4 text-accent-2" aria-hidden /> Belum ada sesi. Sesi fokus ≥ 1 menit tercatat otomatis.
          </p>
        ) : (
          <>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-white/6" role="img" aria-label="Pembagian fokus per kategori">
              {[...byCat.entries()].map(([id, m]) => (
                <span key={id} style={{ width: `${(m / minutes) * 100}%`, background: (categories.get(id) ?? FALLBACK_CATEGORY).color }} />
              ))}
            </div>
            <ul className="divide-y divide-line">
              {[...sessions].reverse().map((x) => (
                <SessionRow key={x.id} session={x} />
              ))}
            </ul>
          </>
        )}
      </Card>

      {picker && <TargetSheet onClose={() => setPicker(false)} current={{ taskId: s.taskId, categoryId: s.categoryId }} />}
      {config && <ConfigSheet settings={settings} onClose={() => setConfig(false)} />}
    </div>
  )
}

function SessionRow({ session: x }: { session: import('@/db/types').FocusSession }) {
  const { map } = useCategories()
  const toast = useToast()
  const task = useLiveQuery(() => (x.taskId ? db.tasks.get(x.taskId) : undefined), [x.taskId])
  const cat = map.get(x.categoryId ?? '') ?? FALLBACK_CATEGORY
  const Icon = iconFor(cat.icon)
  return (
    <li className="flex items-center gap-3 py-2">
      <Icon className="size-4 shrink-0" style={{ color: cat.color }} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{task?.title ?? cat.name}</span>
        <span className="block text-xs text-muted tabular-nums">
          {minToHHMM(nowMinutes(new Date(x.start)))}–{minToHHMM(nowMinutes(new Date(x.end)))} · {durationLabel(x.durationMin)}
          {!x.completed && ' · dihentikan'}
        </span>
      </span>
      <IconButton
        icon={Trash2}
        label="Hapus sesi"
        onClick={async () => {
          await db.sessions.delete(x.id)
          toast({ text: 'Sesi dihapus.', action: { label: 'Urungkan', run: () => void db.sessions.put(x) } })
        }}
      />
    </li>
  )
}

function TargetSheet({ current, onClose }: { current: { taskId?: string; categoryId?: string }; onClose: () => void }) {
  const { ranked } = useTasks()
  const { list: categories, map } = useCategories()
  const pick = (t: { taskId?: string; categoryId?: string }) => {
    focusStore.setTarget(t)
    onClose()
  }
  return (
    <Sheet open onClose={onClose} title="Sedang mengerjakan apa?">
      <div className="space-y-5">
        <div className="space-y-2">
          <span className="text-[13px] font-medium text-muted">Kategori saja</span>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Chip key={c.id} color={c.color} active={!current.taskId && current.categoryId === c.id} onClick={() => pick({ categoryId: c.id })}>
                {c.name}
              </Chip>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <span className="text-[13px] font-medium text-muted">Tugas (urut prioritas)</span>
          {ranked.length === 0 ? (
            <p className="text-sm text-faint">Belum ada tugas aktif.</p>
          ) : (
            <ul className="divide-y divide-line rounded-2xl border border-line">
              {ranked.slice(0, 12).map(({ task }) => {
                const c = map.get(task.categoryId) ?? FALLBACK_CATEGORY
                const active = current.taskId === task.id
                return (
                  <li key={task.id}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => pick({ taskId: task.id, categoryId: task.categoryId })}
                      className={cn('flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-white/5', active && 'bg-white/8')}
                    >
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: c.color }} aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-sm">{task.title}</span>
                      {task.due && <span className="text-xs text-faint">{fmt(task.due, 'd MMM')}</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        {(current.taskId || current.categoryId) && (
          <Button variant="ghost" className="w-full" onClick={() => pick({})}>
            Kosongkan pilihan
          </Button>
        )}
      </div>
    </Sheet>
  )
}

function ConfigSheet({ settings, onClose }: { settings: Settings; onClose: () => void }) {
  const rows: { key: 'focusMin' | 'shortBreakMin' | 'longBreakMin' | 'longBreakEvery'; label: string; min: number; max: number; step: number; unit: string }[] = [
    { key: 'focusMin', label: 'Fokus', min: 5, max: 90, step: 5, unit: 'mnt' },
    { key: 'shortBreakMin', label: 'Istirahat pendek', min: 1, max: 30, step: 1, unit: 'mnt' },
    { key: 'longBreakMin', label: 'Istirahat panjang', min: 5, max: 60, step: 5, unit: 'mnt' },
    { key: 'longBreakEvery', label: 'Istirahat panjang tiap', min: 2, max: 8, step: 1, unit: 'sesi' },
  ]
  return (
    <Sheet open onClose={onClose} title="Atur timer" footer={<Button variant="primary" className="flex-1" onClick={onClose}>Selesai mengatur</Button>}>
      <ul className="divide-y divide-line">
        {rows.map((r) => {
          const v = settings[r.key]
          return (
            <li key={r.key} className="flex items-center gap-3 py-2">
              <span className="flex-1 text-sm">{r.label}</span>
              <IconButton icon={Minus} label={`Kurangi ${r.label}`} disabled={v <= r.min} onClick={() => setSetting(r.key, Math.max(r.min, v - r.step))} className="disabled:opacity-30" />
              <span className="w-16 text-center font-display text-lg font-semibold tabular-nums">
                {v}
                <span className="ml-1 text-xs font-normal text-muted">{r.unit}</span>
              </span>
              <IconButton icon={Plus} label={`Tambah ${r.label}`} disabled={v >= r.max} onClick={() => setSetting(r.key, Math.min(r.max, v + r.step))} className="disabled:opacity-30" />
            </li>
          )
        })}
      </ul>
      <p className="pt-2 text-xs text-faint">Perubahan berlaku untuk sesi berikutnya.</p>
    </Sheet>
  )
}
