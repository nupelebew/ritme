export type Phase = 'focus' | 'short' | 'long'
export type Status = 'idle' | 'running' | 'paused'

export interface FocusConfig {
  focusMin: number
  shortBreakMin: number
  longBreakMin: number
  longBreakEvery: number
}

export interface FocusState {
  phase: Phase
  status: Status
  durationMs: number
  /** Saat berjalan: kapan fase berakhir (epoch ms) */
  endsAt?: number
  /** Saat dijeda: sisa waktu */
  remainingMs?: number
  /** Awal fase fokus ini (untuk catatan sesi) */
  startedAt?: number
  taskId?: string
  categoryId?: string
  /** Jumlah sesi fokus selesai dalam siklus ini */
  cycle: number
  /** Sesi berdurasi bebas (tanpa istirahat otomatis) */
  custom?: boolean
}

export interface SessionLog {
  start: number
  end: number
  durationMs: number
  taskId?: string
  categoryId?: string
  completed: boolean
}

export interface FocusEvents {
  onLog: (s: SessionLog) => void
  /** Dipanggil saat fase selesai sendiri. `fresh` = baru saja terjadi (bukan menyusul setelah aplikasi dibuka lagi) */
  onPhaseEnd?: (phase: Phase, next: Phase, fresh: boolean) => void
}

const MIN = 60_000
export const MIN_LOG_MS = MIN

const durationFor = (p: Phase, c: FocusConfig) =>
  (p === 'focus' ? c.focusMin : p === 'short' ? c.shortBreakMin : c.longBreakMin) * MIN

export function createFocusStore(
  config: FocusConfig,
  events: FocusEvents,
  opts: { now?: () => number; storage?: Pick<Storage, 'getItem' | 'setItem'>; key?: string } = {},
) {
  const now = opts.now ?? Date.now
  const key = opts.key ?? 'ritme-focus'
  let cfg = config
  let state: FocusState = { phase: 'focus', status: 'idle', durationMs: durationFor('focus', cfg), cycle: 0 }
  try {
    const saved = opts.storage?.getItem(key)
    if (saved) state = { ...state, ...JSON.parse(saved) }
  } catch {
    /* data rusak: mulai dari awal */
  }
  const subs = new Set<() => void>()

  const set = (patch: Partial<FocusState>) => {
    state = { ...state, ...patch }
    try {
      opts.storage?.setItem(key, JSON.stringify(state))
    } catch {
      /* penyimpanan penuh / mode privat */
    }
    subs.forEach((f) => f())
  }

  const remaining = (s = state) =>
    s.status === 'running' ? Math.max(0, (s.endsAt ?? 0) - now()) : s.status === 'paused' ? (s.remainingMs ?? 0) : s.durationMs

  const logFocus = (end: number, completed: boolean) => {
    if (state.phase !== 'focus' || !state.startedAt) return
    const elapsed = state.durationMs - (state.status === 'running' ? Math.max(0, (state.endsAt ?? end) - end) : remaining())
    if (elapsed < MIN_LOG_MS) return
    events.onLog({
      start: state.startedAt,
      end,
      durationMs: elapsed,
      taskId: state.taskId,
      categoryId: state.categoryId,
      completed,
    })
  }

  const api = {
    get: () => state,
    subscribe(f: () => void) {
      subs.add(f)
      return () => subs.delete(f)
    },
    remaining,
    configure(c: FocusConfig) {
      cfg = c
      if (state.status === 'idle') set({ durationMs: durationFor(state.phase, cfg) })
    },
    setPhase(p: Phase) {
      if (state.status !== 'idle') return
      set({ phase: p, durationMs: durationFor(p, cfg) })
    },
    setTarget(t: { taskId?: string; categoryId?: string }) {
      set({ taskId: t.taskId, categoryId: t.categoryId })
    },
    start() {
      if (state.status === 'running') return
      const t = now()
      if (state.status === 'paused') set({ status: 'running', endsAt: t + (state.remainingMs ?? 0), remainingMs: undefined })
      else set({ status: 'running', endsAt: t + state.durationMs, startedAt: t })
    },
    /**
     * Sesi fokus berdurasi bebas (mis. "5 menit dulu"). Tidak menambah siklus dan
     * tidak memicu istirahat otomatis; sesi yang sedang jalan dihentikan & dicatat dulu.
     */
    startCustom(min: number, target?: { taskId?: string; categoryId?: string }) {
      if (state.status !== 'idle') api.stop()
      const t = now()
      set({
        phase: 'focus',
        status: 'running',
        durationMs: min * MIN,
        endsAt: t + min * MIN,
        startedAt: t,
        remainingMs: undefined,
        custom: true,
        ...(target ? { taskId: target.taskId, categoryId: target.categoryId } : {}),
      })
    },
    pause() {
      if (state.status !== 'running') return
      set({ status: 'paused', remainingMs: remaining(), endsAt: undefined })
    },
    /** Hentikan fase sekarang. Fokus ≥ 1 menit tetap dicatat (belum selesai). */
    stop() {
      if (state.status === 'idle') return
      logFocus(now(), false)
      set({ status: 'idle', phase: 'focus', durationMs: durationFor('focus', cfg), endsAt: undefined, remainingMs: undefined, startedAt: undefined, custom: undefined })
    },
    /** Lewati ke fase berikutnya. Fokus yang dilewati dicatat bila ≥ 1 menit. */
    skip() {
      if (state.phase === 'focus') {
        if (state.status !== 'idle') logFocus(now(), false)
        api.toNext(now(), false)
      } else set({ phase: 'focus', status: 'idle', durationMs: durationFor('focus', cfg), endsAt: undefined, remainingMs: undefined, startedAt: undefined })
    },
    /** @internal pindah dari fokus ke istirahat (berjalan otomatis) */
    toNext(at: number, completedFocus: boolean) {
      const cycle = completedFocus ? state.cycle + 1 : state.cycle
      const next: Phase = completedFocus && cycle % cfg.longBreakEvery === 0 ? 'long' : 'short'
      const dur = durationFor(next, cfg)
      set({ phase: next, status: 'running', durationMs: dur, endsAt: at + dur, remainingMs: undefined, startedAt: at, cycle: next === 'long' ? 0 : cycle, custom: undefined })
      return next
    },
    /** Panggil berkala. Menyelesaikan fase yang waktunya habis (bisa menyusul beberapa fase). */
    tick() {
      for (let guard = 0; guard < 4 && state.status === 'running' && now() >= (state.endsAt ?? Infinity); guard++) {
        const endedAt = state.endsAt!
        const fresh = now() - endedAt < 60_000
        const phase = state.phase
        if (phase === 'focus' && state.custom) {
          logFocus(endedAt, true)
          set({ phase: 'focus', status: 'idle', durationMs: durationFor('focus', cfg), endsAt: undefined, startedAt: undefined, custom: undefined })
          events.onPhaseEnd?.(phase, 'focus', fresh)
        } else if (phase === 'focus') {
          logFocus(endedAt, true)
          const next = api.toNext(endedAt, true)
          events.onPhaseEnd?.(phase, next, fresh)
        } else {
          set({ phase: 'focus', status: 'idle', durationMs: durationFor('focus', cfg), endsAt: undefined, startedAt: undefined })
          events.onPhaseEnd?.(phase, 'focus', fresh)
        }
      }
    },
  }
  return api
}

export type FocusStore = ReturnType<typeof createFocusStore>
