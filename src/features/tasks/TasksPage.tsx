import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { CalendarDays, CheckCircle2, Flag, ListChecks, Plus, Tag, Timer, Wand2 } from 'lucide-react'
import { Chip, EmptyState, Fab, PageHeader } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { db } from '@/db/db'
import { useCategories } from '@/db/hooks'
import { addTask } from '@/db/tasks'
import type { Task } from '@/db/types'
import { durationLabel } from '@/lib/date'
import { BUCKET_LABEL, PRIORITY, bucketOf, dueLabel, type Bucket } from '@/lib/priority'
import { parseQuickAdd } from '@/lib/quickAdd'
import { cn } from '@/lib/cn'
import { TaskRow } from './TaskRow'
import { TaskSheet } from './TaskSheet'
import { TopThree } from './TopThree'
import { useTasks, useToggleTask } from './useTasks'

const ORDER: Bucket[] = ['overdue', 'today', 'week', 'later', 'none']

export function TasksPage() {
  const { all, ranked, doneToday, today, ready } = useTasks()
  const { list: categories, map } = useCategories()
  const toggle = useToggleTask()
  const toast = useToast()
  const [tab, setTab] = useState<'active' | 'done'>('active')
  const [cat, setCat] = useState<string | null>(null)
  // Pintasan ikon "Tambah tugas" membuka /tugas?baru=1; hasil pencarian membuka /tugas?buka=<id>
  const [params, setParams] = useSearchParams()
  const [open, setOpen] = useState<Task | 'new' | null>(() => (params.get('baru') ? 'new' : null))
  const bukaId = params.get('buka')
  useEffect(() => {
    if (params.get('baru')) setParams({}, { replace: true })
  }, [params, setParams])
  useEffect(() => {
    if (!bukaId) return
    void db.tasks.get(bukaId).then((t) => {
      if (t) {
        setOpen(t)
        if (t.done) setTab('done')
      }
      setParams({}, { replace: true })
    })
  }, [bukaId, setParams])
  const [quick, setQuick] = useState('')

  const parsed = quick.trim() ? parseQuickAdd(quick, today, categories) : null

  const submitQuick = async () => {
    if (!parsed?.title) return
    // Kosongkan dulu supaya ketikan berikutnya tidak tercampur saat penyimpanan berjalan
    setQuick('')
    await addTask({
      title: parsed.title,
      categoryId: parsed.categoryId ?? cat ?? categories[0]?.id ?? 'skripsi',
      priority: parsed.priority ?? 2,
      due: parsed.due,
      estimateMin: parsed.estimateMin,
    })
    toast({ text: 'Tugas ditambahkan.' })
  }

  const groups = useMemo(() => {
    const active = ranked.filter((s) => !cat || s.task.categoryId === cat)
    return ORDER.map((b) => ({ b, items: active.filter((s) => bucketOf(s.task, today) === b) })).filter((g) => g.items.length)
  }, [ranked, cat, today])

  const done = useMemo(
    () =>
      all
        .filter((t) => t.done && (!cat || t.categoryId === cat))
        .sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0))
        .slice(0, 100),
    [all, cat],
  )

  const activeCount = ranked.length

  return (
    <div className="animate-rise space-y-4">
      <PageHeader eyebrow={`${activeCount} aktif · ${doneToday} selesai hari ini`} title="Tugas" />

      {/* Tambah cepat */}
      <form
        className="glass rounded-3xl p-2 transition focus-within:border-accent [&_input:focus-visible]:outline-none"
        onSubmit={(e) => {
          e.preventDefault()
          submitQuick()
        }}
      >
        <div className="flex items-center gap-2">
          <Wand2 className="ml-2 size-5 shrink-0 text-accent" aria-hidden />
          <input
            className="min-h-11 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-faint"
            placeholder="Tambah cepat: Kirim draft besok !3 #skripsi"
            aria-label="Tambah tugas cepat"
            value={quick}
            onChange={(e) => setQuick(e.target.value)}
            enterKeyHint="done"
          />
          <button
            type="submit"
            disabled={!parsed?.title}
            className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(110deg,var(--accent),var(--accent-2))] text-on-accent transition disabled:opacity-30"
            aria-label="Simpan tugas"
          >
            <Plus className="size-5" aria-hidden />
          </button>
        </div>
        {parsed && (
          <div className="flex flex-wrap gap-1.5 px-2 pb-1 pt-1 text-[11px] text-muted" aria-live="polite">
            <Pill icon={Tag} color={map.get(parsed.categoryId ?? cat ?? categories[0]?.id ?? '')?.color}>
              {map.get(parsed.categoryId ?? cat ?? categories[0]?.id ?? '')?.name}
            </Pill>
            {parsed.due && <Pill icon={CalendarDays}>{dueLabel(parsed.due, today)}</Pill>}
            {parsed.priority && (
              <Pill icon={Flag} color={PRIORITY[parsed.priority].color}>
                {PRIORITY[parsed.priority].label}
              </Pill>
            )}
            {parsed.estimateMin && <Pill icon={Timer}>{durationLabel(parsed.estimateMin)}</Pill>}
          </div>
        )}
      </form>

      {tab === 'active' && (
        <TopThree
          ranked={ranked.slice(0, 3)}
          doneToday={doneToday}
          categories={map}
          today={today}
          onToggle={toggle}
          onOpen={setOpen}
        />
      )}

      <div className="flex items-center gap-2">
        <div role="tablist" aria-label="Status tugas" className="glass flex rounded-2xl p-1">
          {(['active', 'done'] as const).map((v) => (
            <button
              key={v}
              role="tab"
              type="button"
              aria-selected={tab === v}
              onClick={() => setTab(v)}
              className={cn('min-h-10 rounded-xl px-3.5 text-sm transition', tab === v ? 'bg-white/12 font-semibold' : 'text-muted')}
            >
              {v === 'active' ? 'Aktif' : 'Selesai'}
            </button>
          ))}
        </div>
        <div className="scroll-thin -mr-4 flex min-w-0 flex-1 gap-2 overflow-x-auto pr-4">
          <Chip active={!cat} onClick={() => setCat(null)}>
            Semua
          </Chip>
          {categories.map((c) => (
            <Chip key={c.id} active={cat === c.id} color={c.color} onClick={() => setCat(cat === c.id ? null : c.id)}>
              {c.name}
            </Chip>
          ))}
        </div>
      </div>

      {ready && tab === 'active' && groups.length === 0 && (
        <EmptyState
          icon={ListChecks}
          title={cat ? 'Kategori ini bersih' : 'Belum ada tugas'}
          body="Ketik di kolom tambah cepat di atas. Coba: “Bimbingan kamis !3 #skripsi 1j”."
        />
      )}
      {tab === 'active' &&
        groups.map(({ b, items }) => (
          <section key={b} aria-label={BUCKET_LABEL[b]}>
            <h2 className={cn('mb-1 px-1 text-xs font-semibold uppercase tracking-[0.14em]', b === 'overdue' ? 'text-danger' : 'text-faint')}>
              {BUCKET_LABEL[b]} · {items.length}
            </h2>
            <ul className="glass divide-y divide-line rounded-3xl px-1">
              {items.map(({ task }) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  category={map.get(task.categoryId)}
                  today={today}
                  onToggle={() => toggle(task)}
                  onOpen={() => setOpen(task)}
                />
              ))}
            </ul>
          </section>
        ))}

      {tab === 'done' &&
        (done.length ? (
          <ul className="glass divide-y divide-line rounded-3xl px-1">
            {done.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                category={map.get(task.categoryId)}
                today={today}
                onToggle={() => toggle(task)}
                onOpen={() => setOpen(task)}
              />
            ))}
          </ul>
        ) : (
          <EmptyState icon={CheckCircle2} title="Belum ada yang selesai" body="Tugas yang kamu centang akan tercatat di sini." />
        ))}

      <Fab icon={Plus} onClick={() => setOpen('new')}>
        Tambah tugas
      </Fab>

      {open && (
        <TaskSheet
          key={open === 'new' ? 'new' : open.id}
          task={open === 'new' ? undefined : open}
          initial={open === 'new' && cat ? { categoryId: cat } : undefined}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  )
}

function Pill({ icon: Icon, color, children }: { icon: typeof Tag; color?: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5" style={color ? { color } : undefined}>
      <Icon className="size-3" aria-hidden />
      <span className="text-ink">{children}</span>
    </span>
  )
}
