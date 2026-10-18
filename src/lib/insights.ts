import type { DateKey, FocusSession, Task } from '@/db/types'
import { fromKey } from './date'

/* ---------- Jam emas ---------- */

/** Sebar menit tiap sesi ke jam-jam yang dilaluinya, hasil: menit per jam (0–23) */
export function minutesByHour(sessions: Pick<FocusSession, 'start' | 'durationMin'>[]) {
  const by = Array<number>(24).fill(0)
  for (const s of sessions) {
    const d = new Date(s.start)
    let h = d.getHours()
    let m = d.getMinutes()
    let left = s.durationMin
    while (left > 0) {
      const chunk = Math.min(left, 60 - m)
      by[h % 24] += chunk
      left -= chunk
      h++
      m = 0
    }
  }
  return by
}

export interface GoldenHours {
  byHour: number[]
  /** Jendela 3 jam dengan fokus terbanyak: [jamMulai, jamSelesai) */
  window: [number, number]
  /** Cukup data untuk dipercaya (≥ 8 sesi) */
  confident: boolean
}

export function goldenHours(sessions: Pick<FocusSession, 'start' | 'durationMin'>[], span = 3): GoldenHours {
  const byHour = minutesByHour(sessions)
  let best = 8
  let bestSum = -1
  let bestMid = -1
  for (let h = 5; h + span <= 24; h++) {
    const sum = byHour.slice(h, h + span).reduce((a, b) => a + b, 0)
    // Bila seri, pilih jendela yang jam tengahnya paling padat (fokus berada di tengah jendela)
    const mid = byHour[h + Math.floor(span / 2)]
    if (sum > bestSum || (sum === bestSum && mid > bestMid)) {
      bestSum = sum
      bestMid = mid
      best = h
    }
  }
  return { byHour, window: [best, best + span], confident: sessions.length >= 8 && bestSum > 0 }
}

/* ---------- Estimasi vs kenyataan ---------- */

export interface EstimateStats {
  /** Median rasio menit nyata / estimasi */
  ratio: number
  samples: number
}

export function estimateStats(tasks: Task[], sessions: Pick<FocusSession, 'taskId' | 'durationMin'>[]): EstimateStats | null {
  const actual = new Map<string, number>()
  for (const s of sessions) if (s.taskId) actual.set(s.taskId, (actual.get(s.taskId) ?? 0) + s.durationMin)
  const ratios = tasks
    .filter((t) => t.done && t.estimateMin && (actual.get(t.id) ?? 0) >= 5)
    .map((t) => actual.get(t.id)! / t.estimateMin!)
    .sort((a, b) => a - b)
  if (!ratios.length) return null
  const mid = Math.floor(ratios.length / 2)
  const ratio = ratios.length % 2 ? ratios[mid] : (ratios[mid - 1] + ratios[mid]) / 2
  return { ratio: Math.round(ratio * 100) / 100, samples: ratios.length }
}

/** Estimasi yang disesuaikan kebiasaanmu; hanya bila datanya cukup & masuk akal */
export function adjustEstimate(min: number, st: EstimateStats | null) {
  if (!st || st.samples < 3 || st.ratio < 0.5 || st.ratio > 3 || Math.abs(st.ratio - 1) < 0.15) return min
  return Math.max(5, Math.round((min * st.ratio) / 5) * 5)
}

/* ---------- Target mingguan ---------- */

export interface TargetProgress {
  categoryId: string
  target: number
  done: number
  pct: number
  /** Tertinggal dari laju yang wajar untuk hari ini dalam minggu */
  behind: boolean
}

/**
 * Progres per kategori minggu ini.
 * "Selesai" = maksimum dari menit fokus tercatat dan menit jadwal yang sudah lewat
 * (supaya kategori tanpa timer seperti Santai/Bareng Pasangan tetap terhitung).
 */
export function weeklyProgress(
  targets: Record<string, number>,
  weekStart: DateKey,
  today: DateKey,
  nowMin: number,
  events: { date: DateKey; start: number; end: number; categoryId: string }[],
  sessions: Pick<FocusSession, 'date' | 'durationMin' | 'categoryId'>[],
): TargetProgress[] {
  const dayIdx = Math.round((fromKey(today).getTime() - fromKey(weekStart).getTime()) / 86_400_000)
  const expected = Math.min(1, (dayIdx + nowMin / 1440) / 7)
  return Object.entries(targets)
    .filter(([, t]) => t > 0)
    .map(([categoryId, target]) => {
      const focus = sessions.filter((s) => s.categoryId === categoryId && s.date >= weekStart && s.date <= today).reduce((a, s) => a + s.durationMin, 0)
      const elapsed = events
        .filter((e) => e.categoryId === categoryId && e.date >= weekStart && e.date <= today)
        .reduce((a, e) => a + (e.date < today ? e.end - e.start : Math.max(0, Math.min(e.end, nowMin) - e.start)), 0)
      const done = Math.max(focus, elapsed)
      return { categoryId, target, done, pct: Math.min(100, Math.round((done / target) * 100)), behind: done < target * expected * 0.7 && dayIdx >= 1 }
    })
}
