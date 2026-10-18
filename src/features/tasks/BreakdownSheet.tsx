import { useState } from 'react'
import { ClipboardCopy, ExternalLink, ListPlus, Wand2 } from 'lucide-react'
import { Button, Field, Sheet } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { useSettings } from '@/db/settings'
import type { Task } from '@/db/types'
import { copyText } from '@/lib/clipboard'
import { durationLabel } from '@/lib/date'
import { GENERIC_STEPS, buildBreakdownPrompt, parseBreakdown, type BreakdownStep } from '@/lib/plan/breakdown'

/** Pecah tugas besar jadi subtugas: lewat Claude (salin-tempel) atau pola umum tanpa AI */
export function BreakdownSheet({
  task,
  categoryName,
  onAdd,
  onClose,
}: {
  task: Task
  categoryName?: string
  onAdd: (steps: BreakdownStep[]) => void
  onClose: () => void
}) {
  const s = useSettings()
  const toast = useToast()
  const [pasted, setPasted] = useState('')
  const [steps, setSteps] = useState<BreakdownStep[] | null>(null)
  const [error, setError] = useState('')

  const check = (text: string) => {
    setPasted(text)
    if (!text.trim()) return setSteps(null), setError('')
    const r = parseBreakdown(text)
    setSteps(r.steps ?? null)
    setError(r.error ?? '')
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="Pecah jadi langkah kecil"
      footer={
        <Button
          variant="primary"
          icon={ListPlus}
          className="flex-1"
          disabled={!steps?.length}
          onClick={() => {
            onAdd(steps!)
            toast({ text: `${steps!.length} subtugas ditambahkan.`, tone: 'success' })
            onClose()
          }}
        >
          {steps?.length ? `Tambahkan ${steps.length} subtugas` : 'Tambahkan subtugas'}
        </Button>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Tugas: <b className="text-ink">{task.title}</b>
        </p>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Button
            variant="primary"
            icon={ClipboardCopy}
            onClick={async () => {
              const ok = await copyText(buildBreakdownPrompt(task, { about: s.about, category: categoryName }))
              toast(ok ? { text: 'Prompt tersalin. Tempel ke Claude.', tone: 'success' } : { text: 'Gagal menyalin.', tone: 'error' })
            }}
          >
            Salin prompt AI
          </Button>
          <a href="https://claude.ai/new" target="_blank" rel="noreferrer" className="glass inline-flex min-h-11 items-center gap-1.5 rounded-2xl px-3 text-sm hover:bg-white/10">
            Claude <ExternalLink className="size-4" aria-hidden />
          </a>
        </div>
        <Field label="Tempel balasan Claude">
          <textarea className="field min-h-24 resize-y font-mono text-xs" value={pasted} onChange={(e) => check(e.target.value)} spellCheck={false} />
        </Field>
        <Button size="sm" variant="ghost" icon={Wand2} onClick={() => (setSteps(GENERIC_STEPS), setError(''))}>
          Tanpa AI: pakai pola umum
        </Button>
        {error && (
          <p className="rounded-xl bg-danger/10 p-3 text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        {steps && (
          <ol className="list-inside list-decimal space-y-1 rounded-2xl border border-line p-3 text-sm">
            {steps.map((st, i) => (
              <li key={i}>
                {st.title}
                {st.estimateMin ? <span className="text-faint"> · {durationLabel(st.estimateMin)}</span> : null}
              </li>
            ))}
          </ol>
        )}
      </div>
    </Sheet>
  )
}
