import { useEffect, useRef, useState } from 'react'
import { CalendarPlus, Check, Plus, Trash2, X } from 'lucide-react'
import { Button, Chip, Field, IconButton, Sheet } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { db, uid } from '@/db/db'
import { useCategories } from '@/db/hooks'
import { useSettings } from '@/db/settings'
import { addTask, deleteTask, scheduleTaskToday } from '@/db/tasks'
import type { Priority, Subtask, Task } from '@/db/types'
import { durationLabel, minToHHMM, shiftKey, todayKey } from '@/lib/date'
import { PRIORITY } from '@/lib/priority'
import { cn } from '@/lib/cn'

type Draft = Omit<Task, 'id' | 'createdAt' | 'done'> & Partial<Pick<Task, 'id' | 'createdAt' | 'done' | 'doneAt'>>

export function TaskSheet({ task, initial, onClose }: { task?: Task; initial?: Partial<Draft>; onClose: () => void }) {
  const toast = useToast()
  const settings = useSettings()
  const { list: categories } = useCategories()
  const today = todayKey()
  const [t, setT] = useState<Draft>(
    task ?? {
      title: '',
      categoryId: categories[0]?.id ?? 'skripsi',
      priority: 2,
      subtasks: [],
      ...initial,
    },
  )
  const [newSub, setNewSub] = useState('')
  const set = (p: Partial<Draft>) => setT((x) => ({ ...x, ...p }))

  // Tugas yang sudah ada: simpan otomatis
  const first = useRef(true)
  useEffect(() => {
    if (!task) return
    if (first.current) {
      first.current = false
      return
    }
    const id = setTimeout(() => {
      if (t.title.trim()) db.tasks.put({ ...(t as Task), title: t.title.trim() })
    }, 250)
    return () => clearTimeout(id)
  }, [t, task])

  const close = async () => {
    if (task && t.title.trim()) await db.tasks.put({ ...(t as Task), title: t.title.trim() })
    onClose()
  }

  const create = async () => {
    if (!t.title.trim()) return
    const pending = newSub.trim() ? [...t.subtasks, { id: uid(), title: newSub.trim(), done: false }] : t.subtasks
    await addTask({ ...t, title: t.title.trim(), subtasks: pending })
    toast({ text: 'Tugas ditambahkan.' })
    onClose()
  }

  const remove = async () => {
    if (!task) return
    const undo = await deleteTask(task)
    toast({ text: 'Tugas dihapus.', action: { label: 'Urungkan', run: undo } })
    onClose()
  }

  const schedule = async () => {
    const ev = await scheduleTaskToday({ ...(t as Task), id: task?.id ?? '' }, settings.dayEndHour)
    toast(
      ev
        ? { text: `Dijadwalkan hari ini ${minToHHMM(ev.start)}–${minToHHMM(ev.end)}.`, tone: 'success' }
        : { text: 'Tidak ada slot kosong lagi hari ini.', tone: 'error' },
    )
  }

  const addSub = () => {
    const title = newSub.trim()
    if (!title) return
    set({ subtasks: [...t.subtasks, { id: uid(), title, done: false }] })
    setNewSub('')
  }
  const updSub = (id: string, p: Partial<Subtask>) => set({ subtasks: t.subtasks.map((s) => (s.id === id ? { ...s, ...p } : s)) })

  const dueChips = [
    { label: 'Hari ini', v: today },
    { label: 'Besok', v: shiftKey(today, 1) },
    { label: 'Minggu depan', v: shiftKey(today, 7) },
  ]

  return (
    <Sheet
      open
      onClose={close}
      title={task ? 'Detail tugas' : 'Tugas baru'}
      footer={
        task ? (
          <>
            <Button variant="danger" icon={Trash2} onClick={remove}>
              Hapus
            </Button>
            <Button
              icon={CalendarPlus}
              onClick={schedule}
              className="flex-1"
              disabled={t.done}
              title="Masukkan ke slot kosong berikutnya di timeline hari ini"
            >
              Jadwalkan
            </Button>
            <Button variant="primary" icon={Check} onClick={close}>
              Simpan
            </Button>
          </>
        ) : (
          <Button variant="primary" icon={Plus} className="flex-1" disabled={!t.title.trim()} onClick={create}>
            Tambah tugas
          </Button>
        )
      }
    >
      <div className="space-y-5">
        <Field label="Judul tugas">
          <input
            className="field"
            value={t.title}
            maxLength={120}
            placeholder="mis. Rapikan daftar pustaka"
            onChange={(e) => set({ title: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && !task && create()}
          />
        </Field>

        <div className="space-y-1.5">
          <span className="text-[13px] font-medium text-muted">Kategori</span>
          <div className="scroll-thin -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {categories.map((c) => (
              <Chip key={c.id} active={t.categoryId === c.id} color={c.color} onClick={() => set({ categoryId: c.id })}>
                {c.name}
              </Chip>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-[13px] font-medium text-muted">Prioritas</span>
          <div role="radiogroup" aria-label="Prioritas" className="grid grid-cols-4 gap-1.5">
            {([1, 2, 3, 4] as Priority[]).map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={t.priority === p}
                onClick={() => set({ priority: p })}
                className={cn('min-h-11 rounded-xl border text-[13px] transition', t.priority === p ? 'font-semibold text-ink' : 'border-line text-muted')}
                style={t.priority === p ? { borderColor: PRIORITY[p].color, background: `color-mix(in srgb, ${PRIORITY[p].color} 18%, transparent)` } : undefined}
              >
                {PRIORITY[p].label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-[13px] font-medium text-muted">Tenggat</span>
          <div className="flex flex-wrap gap-2">
            {dueChips.map((c) => (
              <Chip key={c.label} active={t.due === c.v} onClick={() => set({ due: t.due === c.v ? undefined : c.v })}>
                {c.label}
              </Chip>
            ))}
            <input
              type="date"
              aria-label="Pilih tanggal tenggat"
              className="field min-h-11 w-auto flex-1 rounded-full py-1"
              value={t.due ?? ''}
              onChange={(e) => set({ due: e.target.value || undefined })}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-[13px] font-medium text-muted">Perkiraan waktu</span>
          <div className="flex flex-wrap gap-2">
            {[15, 30, 60, 120, 240].map((m) => (
              <Chip key={m} active={t.estimateMin === m} onClick={() => set({ estimateMin: t.estimateMin === m ? undefined : m })}>
                {durationLabel(m)}
              </Chip>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-[13px] font-medium text-muted">
            Subtugas {t.subtasks.length > 0 && `(${t.subtasks.filter((s) => s.done).length}/${t.subtasks.length})`}
          </span>
          {t.subtasks.length > 0 && (
            <ul className="divide-y divide-line rounded-2xl border border-line">
              {t.subtasks.map((s) => (
                <li key={s.id} className="flex items-center gap-1 pl-1">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={s.done}
                    aria-label={`Subtugas ${s.title}`}
                    onClick={() => updSub(s.id, { done: !s.done })}
                    className="grid size-11 shrink-0 place-items-center"
                  >
                    <span
                      className={cn(
                        'grid size-5 place-items-center rounded-md border-2 transition',
                        s.done ? 'border-accent-3 bg-accent-3' : 'border-faint',
                      )}
                    >
                      {s.done && <Check className="size-3.5 text-bg" strokeWidth={3} aria-hidden />}
                    </span>
                  </button>
                  <input
                    className={cn('min-h-11 min-w-0 flex-1 bg-transparent text-sm outline-none', s.done && 'text-faint line-through')}
                    value={s.title}
                    aria-label="Ubah subtugas"
                    onChange={(e) => updSub(s.id, { title: e.target.value })}
                  />
                  <IconButton
                    icon={X}
                    label={`Hapus subtugas ${s.title}`}
                    onClick={() => set({ subtasks: t.subtasks.filter((x) => x.id !== s.id) })}
                  />
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <input
              className="field"
              value={newSub}
              placeholder="Tambah langkah kecil…"
              onChange={(e) => setNewSub(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addSub()
                }
              }}
            />
            <Button icon={Plus} onClick={addSub} disabled={!newSub.trim()} aria-label="Tambah subtugas" />
          </div>
        </div>

        <Field label="Catatan (opsional)">
          <textarea className="field min-h-20 resize-y" value={t.notes ?? ''} onChange={(e) => set({ notes: e.target.value || undefined })} />
        </Field>
      </div>
    </Sheet>
  )
}
