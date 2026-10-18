import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { Bot, ClipboardCopy, ClipboardPaste, ExternalLink, Wand2 } from 'lucide-react'
import { BackHeader } from '@/components/BackHeader'
import { Button, Card, Chip, Field } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { db } from '@/db/db'
import { eventsForDate } from '@/db/events'
import { useCategories } from '@/db/hooks'
import { applyPlan } from '@/db/plan'
import { loadInsights, loadWeekProgress } from '@/db/insights'
import { setSetting, useSettings } from '@/db/settings'
import type { DateKey, DayEntry } from '@/db/types'
import { copyText, readText } from '@/lib/clipboard'
import { fmt, nowMinutes, shiftKey, todayKey } from '@/lib/date'
import { isDue } from '@/lib/habits'
import { autoPlan } from '@/lib/plan/autoPlan'
import { buildPlanPrompt } from '@/lib/plan/prompt'
import { validatePlan, type ValidationResult } from '@/lib/plan/schema'
import { useHabits } from '@/features/habits/useHabits'
import { useTasks } from '@/features/tasks/useTasks'
import { PlanPreview } from './PlanPreview'
import { MicButton, voiceSupported } from '@/components/MicButton'
import { ENERGY } from '@/features/today/SmartCards'

export function PlanPage() {
  const today = todayKey()
  const [date, setDate] = useState<DateKey>(shiftKey(today, 1))
  const settings = useSettings()
  const { list: categories } = useCategories()
  const { all: tasks, ranked } = useTasks()
  const { habits } = useHabits()
  const toast = useToast()
  const navigate = useNavigate()

  const fixed = useLiveQuery(() => eventsForDate(db, date), [date]) ?? []
  const day = useLiveQuery(async () => (await db.days.get(date)) ?? { date }, [date])
  const recentFocus = useLiveQuery(() => db.sessions.where('date').between(shiftKey(today, -7), today, true, false).toArray(), [today])

  // Brain dump: simpan otomatis per tanggal
  const [dump, setDump] = useState<string | null>(null)
  useEffect(() => setDump(null), [date])
  const dumpValue = dump ?? day?.brainDump ?? ''
  useEffect(() => {
    if (dump === null) return
    const id = setTimeout(
      () =>
        db.transaction('rw', db.days, async () => {
          const cur = await db.days.get(date)
          await db.days.put({ ...(cur ?? { date }), brainDump: dump })
        }),
      400,
    )
    return () => clearTimeout(id)
  }, [dump, date])

  const [routines, setRoutines] = useState<string | null>(null)
  const [pasted, setPasted] = useState('')
  const [result, setResult] = useState<(ValidationResult & { source: 'ai' | 'auto' }) | null>(null)

  // Data pintar untuk penyusun & prompt: energi, jam emas, estimasi, target mingguan, jam tidur
  const insights = useLiveQuery(() => loadInsights(db, today), [today])
  const week = useLiveQuery(() => loadWeekProgress(db, settings.weeklyTargets, today, nowMinutes()), [JSON.stringify(settings.weeklyTargets), today]) ?? []
  const energy = day?.energy
  const setEnergy = (v?: DayEntry['energy']) =>
    db.transaction('rw', db.days, async () => {
      const cur = await db.days.get(date)
      await db.days.put({ ...(cur ?? { date }), energy: v })
    })
  const behind = week.filter((w) => w.behind).map((w) => w.categoryId)
  const golden = insights?.golden.confident ? insights.golden.window : undefined
  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? id
  const hints = [
    energy ? `Perkiraan energi hari itu: ${energy}/5${energy <= 2 ? ' (rendah — beri beban ringan & jeda lebih banyak)' : ''}.` : '',
    golden ? `Jam paling fokusku biasanya ${String(golden[0]).padStart(2, '0')}:00–${String(golden[1]).padStart(2, '0')}:00; taruh tugas terberat di situ.` : '',
    insights?.estimate && insights.estimate.samples >= 3 && Math.abs(insights.estimate.ratio - 1) >= 0.15
      ? `Pekerjaanku biasanya makan ${insights.estimate.ratio.toLocaleString('id-ID')}× dari estimasi; sesuaikan durasi blok.`
      : '',
    ...week.filter((w) => w.behind).map((w) => `Minggu ini ${catName(w.categoryId)} tertinggal: baru ${Math.round(w.done / 6) / 10} dari target ${w.target / 60} jam.`),
    settings.bedtimeHour ? `Jam tidurku ${String(settings.bedtimeHour % 24).padStart(2, '0')}:00; jangan ada kegiatan setelah ${String(settings.bedtimeHour - 1).padStart(2, '0')}:30.` : '',
  ].filter(Boolean)

  const ctx = useMemo(
    () => ({ categories, tasks, expectedDate: date, fixed: fixed.map((f) => ({ start: f.start, end: f.end, title: f.title })) }),
    [categories, tasks, date, fixed],
  )

  const makePrompt = async () => {
    const avg = recentFocus ? recentFocus.reduce((s, x) => s + x.durationMin, 0) / 7 : undefined
    const prompt = buildPlanPrompt({
      date,
      today,
      name: settings.name || undefined,
      categories,
      fixed,
      routines: routines ?? settings.routines,
      ranked,
      habits: habits.filter((h) => isDue(h, date)),
      brainDump: dumpValue,
      dayStartHour: settings.dayStartHour,
      dayEndHour: settings.dayEndHour,
      focusMin: settings.focusMin,
      avgFocusMin: avg,
      about: settings.about,
      hints,
    })
    const ok = await copyText(prompt)
    toast(
      ok
        ? { text: 'Prompt tersalin. Tempel ke Claude, lalu salin balasannya ke sini.', tone: 'success' }
        : { text: 'Gagal menyalin otomatis. Coba lagi atau izinkan akses clipboard.', tone: 'error' },
    )
  }

  const check = (text: string) => {
    setPasted(text)
    if (!text.trim()) return setResult(null)
    setResult({ ...validatePlan(text, ctx), source: 'ai' })
  }

  const runAuto = () => {
    const plan = autoPlan({
      date,
      today,
      fixed,
      ranked,
      tasks,
      brainDump: dumpValue,
      categories,
      dayStartHour: settings.dayStartHour,
      dayEndHour: settings.dayEndHour,
      nowMin: date === today ? nowMinutes() : undefined,
      energy,
      bedtimeHour: settings.bedtimeHour,
      golden,
      estimate: insights?.estimate,
      behind,
    })
    setResult({ plan, errors: [], warnings: [], source: 'auto' })
  }

  const apply = async (replace: boolean) => {
    if (!result?.plan) return
    const r = await applyPlan(result.plan, { replace })
    toast({
      text: `${r.events} blok${r.tasks ? ` & ${r.tasks} tugas` : ''} ditambahkan ke ${fmt(date, 'EEEE')}.`,
      tone: 'success',
      action: { label: 'Urungkan', run: r.undo },
    })
    setResult(null)
    setPasted('')
    navigate(date === today ? '/' : `/?d=${date}`)
  }

  const singles = fixed.filter((f) => !f.masterId).length

  return (
    <div className="animate-rise space-y-4">
      <BackHeader title="Rencana" sub={fmt(date, 'EEEE, d MMMM')} />

      <div className="flex gap-2">
        {[
          { label: 'Hari ini', v: today },
          { label: 'Besok', v: shiftKey(today, 1) },
          { label: 'Lusa', v: shiftKey(today, 2) },
        ].map((d) => (
          <Chip key={d.v} active={date === d.v} onClick={() => setDate(d.v)}>
            {d.label}
          </Chip>
        ))}
      </div>

      <Card className="space-y-3">
        <Field label="Brain dump" hint="Tumpahkan semua yang ada di kepala, satu baris satu hal. Boleh pakai format cepat: “revisi bab 2 !3 #skripsi 1j”.">
          <textarea
            className="field min-h-36 resize-y leading-relaxed"
            value={dumpValue}
            onChange={(e) => setDump(e.target.value)}
            placeholder={'- balas chat klien soal revisi\n- baca 2 jurnal untuk bab 2\n- beli galon\n- nonton bareng malam'}
          />
        </Field>
        {voiceSupported() && (
          <div className="-mt-1 flex items-center gap-2 text-xs text-faint">
            <MicButton label="Dikte brain dump" onText={(t) => setDump((dumpValue.trim() ? dumpValue.trimEnd() + '\n' : '') + '- ' + t)} />
            Ketuk mikrofon lalu ucapkan satu hal (butuh internet).
          </div>
        )}
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center text-[13px] font-medium text-muted hover:text-ink">
            Rutinitas tetap (dipakai di prompt) <span className="ml-1 text-faint group-open:hidden">· ketuk untuk ubah</span>
          </summary>
          <textarea
            className="field min-h-20 resize-y text-sm"
            value={routines ?? settings.routines}
            onChange={(e) => setRoutines(e.target.value)}
            onBlur={(e) => setSetting('routines', e.target.value)}
            placeholder="mis. Bangun 06:00, olahraga Selasa & Kamis sore, bimbingan biasanya Rabu."
          />
        </details>
        <div className="space-y-1.5">
          <span className="text-[13px] font-medium text-muted">Perkiraan energi {date === today ? 'hari ini' : 'hari itu'}</span>
          <div role="radiogroup" aria-label="Perkiraan energi" className="grid grid-cols-5 gap-1.5">
            {ENERGY.map((x) => (
              <button
                key={x.v}
                type="button"
                role="radio"
                aria-checked={energy === x.v}
                aria-label={x.l}
                onClick={() => setEnergy(energy === x.v ? undefined : x.v)}
                className={`flex min-h-11 flex-col items-center justify-center rounded-xl border text-lg transition ${energy === x.v ? 'border-accent bg-accent/15' : 'border-line hover:bg-white/5'}`}
              >
                {x.e}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-faint">
          {hints.length > 0 && `${hints.length} petunjuk pintar ikut dipakai (energi, jam emas, target, jam tidur) · `}
          Konteks: {fixed.length} jadwal tetap · {ranked.length} tugas tertunda · {habits.filter((h) => isDue(h, date)).length} kebiasaan
        </p>
      </Card>

      {/* Jalur AI */}
      <Card className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-accent/15 text-accent">
            <Bot className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="font-display font-semibold">Susun bareng Claude</h2>
            <p className="text-[13px] text-muted">Gratis lewat claude.ai: salin prompt, tempel di sana, lalu tempel balasannya di sini.</p>
          </div>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Button variant="primary" icon={ClipboardCopy} onClick={makePrompt}>
            Buat prompt AI
          </Button>
          <a
            href="https://claude.ai/new"
            target="_blank"
            rel="noreferrer"
            className="glass inline-flex min-h-11 items-center gap-1.5 rounded-2xl px-3 text-sm hover:bg-white/10"
          >
            Buka Claude <ExternalLink className="size-4" aria-hidden />
          </a>
        </div>
        <Field label="Tempel hasil dari Claude">
          <textarea
            className="field min-h-28 resize-y font-mono text-xs"
            value={pasted}
            onChange={(e) => check(e.target.value)}
            placeholder={'```json\n{ "date": "…", "blocks": [ … ] }\n```'}
            spellCheck={false}
          />
        </Field>
        <Button
          size="sm"
          icon={ClipboardPaste}
          onClick={async () => {
            const t = await readText()
            if (t) check(t)
            else toast({ text: 'Browser tidak mengizinkan membaca clipboard. Tempel manual (tekan lama → Tempel).' })
          }}
        >
          Tempel dari clipboard
        </Button>
      </Card>

      {/* Jalur lokal */}
      <Card className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-accent-3/15 text-accent-3">
          <Wand2 className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display font-semibold">Tanpa AI</h2>
          <p className="text-[13px] text-muted">Susun otomatis dari tugas & brain dump, langsung di perangkat.</p>
        </div>
        <Button icon={Wand2} onClick={runAuto}>
          Susun
        </Button>
      </Card>

      {result && (
        <PlanPreview
          key={result.source + (result.plan?.blocks.length ?? 0) + result.errors.join()}
          plan={result.plan}
          errors={result.errors}
          warnings={result.warnings}
          existingCount={singles}
          source={result.source}
          onApply={apply}
        />
      )}
    </div>
  )
}
