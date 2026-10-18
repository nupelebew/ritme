import { useState } from 'react'
import { AlertTriangle, CheckCircle2, ListPlus, Sparkles, XCircle } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { FALLBACK_CATEGORY, useCategories } from '@/db/hooks'
import { durationLabel, minToHHMM } from '@/lib/date'
import type { NormalizedPlan } from '@/lib/plan/schema'
import { cn } from '@/lib/cn'

export function PlanPreview({
  plan,
  errors,
  warnings,
  existingCount,
  source,
  onApply,
}: {
  plan?: NormalizedPlan
  errors: string[]
  warnings: string[]
  existingCount: number
  source: 'ai' | 'auto'
  onApply: (replace: boolean) => void
}) {
  const { map } = useCategories()
  const [replace, setReplace] = useState(false)
  const total = plan?.blocks.reduce((s, b) => s + b.end - b.start, 0) ?? 0

  return (
    <Card className="space-y-4" aria-live="polite">
      <div className="flex items-center gap-2">
        {errors.length ? <XCircle className="size-5 text-danger" aria-hidden /> : <CheckCircle2 className="size-5 text-accent-3" aria-hidden />}
        <h3 className="font-display font-semibold">
          {errors.length ? 'Belum bisa diterapkan' : `Pratinjau ${source === 'ai' ? 'dari Claude' : 'susunan otomatis'}`}
        </h3>
      </div>

      {errors.length > 0 && (
        <ul className="space-y-1 rounded-2xl bg-danger/10 p-3 text-sm text-danger">
          {errors.map((e) => (
            <li key={e}>• {e}</li>
          ))}
        </ul>
      )}
      {warnings.length > 0 && (
        <ul className="space-y-1 rounded-2xl bg-[#f59e0b]/10 p-3 text-[13px] text-[#f59e0b]">
          {warnings.map((w) => (
            <li key={w} className="flex gap-2">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {w}
            </li>
          ))}
        </ul>
      )}

      {plan && (
        <>
          <p className="text-sm text-muted">
            {plan.blocks.length} blok · {durationLabel(total)} terjadwal{plan.newTasks.length ? ` · ${plan.newTasks.length} tugas baru` : ''}
          </p>
          <ol className="relative space-y-1.5 border-l border-line pl-4">
            {plan.blocks.map((b, i) => {
              const c = map.get(b.categoryId) ?? FALLBACK_CATEGORY
              return (
                <li key={i} className="relative">
                  <span className="absolute -left-[21px] top-2.5 size-2.5 rounded-full ring-4 ring-bg" style={{ background: c.color }} aria-hidden />
                  <div className="flex items-baseline gap-3 rounded-xl px-2 py-1.5" style={{ background: `color-mix(in srgb, ${c.color} 10%, transparent)` }}>
                    <span className="w-[86px] shrink-0 font-display text-[13px] tabular-nums text-muted">
                      {minToHHMM(b.start)}–{minToHHMM(b.end)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium leading-snug">{b.title}</span>
                      <span className="text-[11px] text-faint">
                        {c.name}
                        {b.taskId ? ' · tertaut tugas' : ''}
                      </span>
                    </span>
                  </div>
                </li>
              )
            })}
          </ol>

          {plan.newTasks.length > 0 && (
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-[13px] font-medium text-muted">
                <ListPlus className="size-4" aria-hidden /> Tugas baru
              </p>
              <ul className="space-y-1 text-sm">
                {plan.newTasks.map((t, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ background: (map.get(t.categoryId) ?? FALLBACK_CATEGORY).color }} aria-hidden />
                    {t.title}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {plan.top3.length > 0 && (
            <p className="text-[13px] text-muted">
              <span className="font-semibold text-ink">Fokus utama:</span> {plan.top3.join(' · ')}
            </p>
          )}
          {plan.notes && (
            <p className="flex gap-2 rounded-2xl bg-accent/10 p-3 text-[13px]">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
              {plan.notes}
            </p>
          )}

          {existingCount > 0 && (
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
              <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
              <span>
                Ganti {existingCount} kegiatan sekali-jalan yang sudah ada
                <span className="block text-xs text-faint">Jadwal berulang tidak disentuh.</span>
              </span>
            </label>
          )}
          <Button variant="primary" className={cn('w-full')} icon={CheckCircle2} onClick={() => onApply(replace)}>
            Terapkan ke jadwal
          </Button>
        </>
      )}
    </Card>
  )
}
