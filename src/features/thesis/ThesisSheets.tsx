import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, Plus, Trash2 } from 'lucide-react'
import { Button, Field, Sheet, Toggle } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { db, uid } from '@/db/db'
import { addTask } from '@/db/tasks'
import type { Guidance, Milestone } from '@/db/types'
import { shiftKey, todayKey } from '@/lib/date'
import { cn } from '@/lib/cn'

export function MilestoneSheet({ milestone, nextOrder, thesisCat, onClose }: { milestone?: Milestone; nextOrder: number; thesisCat: string; onClose: () => void }) {
  const toast = useToast()
  const [title, setTitle] = useState(milestone?.title ?? '')
  const [due, setDue] = useState(milestone?.due ?? '')
  const [notes, setNotes] = useState(milestone?.notes ?? '')
  const [newTask, setNewTask] = useState('')
  const tasks = useLiveQuery(() => (milestone ? db.tasks.where('milestoneId').equals(milestone.id).toArray() : []), [milestone?.id]) ?? []

  const save = async () => {
    const t = title.trim()
    if (!t) return
    const data = { title: t, due: due || undefined, notes: notes.trim() || undefined }
    if (milestone) await db.milestones.update(milestone.id, data)
    else await db.milestones.add({ ...data, id: uid(), done: false, order: nextOrder })
    onClose()
  }
  const remove = async () => {
    if (!milestone) return
    await db.transaction('rw', db.milestones, db.tasks, async () => {
      await db.milestones.delete(milestone.id)
      await db.tasks.where('milestoneId').equals(milestone.id).modify({ milestoneId: undefined })
    })
    toast({ text: `Milestone "${milestone.title}" dihapus.`, action: { label: 'Urungkan', run: () => void db.milestones.put(milestone) } })
    onClose()
  }
  const addLinked = async () => {
    if (!milestone || !newTask.trim()) return
    await addTask({ title: newTask.trim(), categoryId: thesisCat, priority: 3, milestoneId: milestone.id })
    setNewTask('')
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={milestone ? 'Ubah milestone' : 'Milestone baru'}
      footer={
        <>
          {milestone && (
            <Button variant="danger" icon={Trash2} onClick={remove}>
              Hapus
            </Button>
          )}
          <Button variant="primary" icon={Check} className="flex-1" disabled={!title.trim()} onClick={save}>
            Simpan milestone
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nama">
          <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="mis. Bab 3 · Metodologi" />
        </Field>
        <Field label="Target selesai (opsional)">
          <input type="date" className="field" value={due} onChange={(e) => setDue(e.target.value)} />
        </Field>
        <Field label="Catatan">
          <textarea className="field min-h-20 resize-y text-sm" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        {milestone && (
          <div className="space-y-2">
            <span className="text-[13px] font-medium text-muted">Tugas di milestone ini ({tasks.filter((t) => t.done).length}/{tasks.length})</span>
            {tasks.length > 0 && (
              <ul className="space-y-1 text-sm">
                {tasks.map((t) => (
                  <li key={t.id} className={cn('flex items-center gap-2', t.done && 'text-faint line-through')}>
                    <span className={cn('size-2 rounded-full', t.done ? 'bg-accent-3' : 'bg-white/30')} aria-hidden />
                    {t.title}
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <input
                className="field"
                value={newTask}
                placeholder="Tambah tugas ke milestone ini…"
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addLinked()}
              />
              <Button icon={Plus} aria-label="Tambah tugas" onClick={addLinked} disabled={!newTask.trim()} />
            </div>
          </div>
        )}
      </div>
    </Sheet>
  )
}

export function GuidanceSheet({
  entry,
  milestones,
  thesisCat,
  lastLecturer,
  onClose,
}: {
  entry?: Guidance
  milestones: Milestone[]
  thesisCat: string
  lastLecturer?: string
  onClose: () => void
}) {
  const toast = useToast()
  const today = todayKey()
  const [date, setDate] = useState(entry?.date ?? today)
  const [lecturer, setLecturer] = useState(entry?.lecturer ?? lastLecturer ?? '')
  const [notes, setNotes] = useState(entry?.notes ?? '')
  const [revText, setRevText] = useState('')
  const [makeTasks, setMakeTasks] = useState(true)
  const [milestoneId, setMilestoneId] = useState<string | undefined>(milestones.find((m) => !m.done)?.id)

  const save = async () => {
    const lines = revText
      .split(/\n+/)
      .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
      .filter((l) => l.length > 1)
    const newRevs = []
    for (const text of lines) {
      const task = makeTasks
        ? await addTask({ title: `Revisi: ${text}`, categoryId: thesisCat, priority: 3, due: shiftKey(date, 7), milestoneId })
        : undefined
      newRevs.push({ id: uid(), text, taskId: task?.id })
    }
    const base = { date, lecturer: lecturer.trim() || undefined, notes: notes.trim() || undefined }
    if (entry) await db.guidance.update(entry.id, { ...base, revisions: [...entry.revisions, ...newRevs] })
    else await db.guidance.add({ ...base, id: uid(), revisions: newRevs, createdAt: Date.now() })
    toast({ text: newRevs.length && makeTasks ? `Bimbingan dicatat, ${newRevs.length} revisi jadi tugas.` : 'Bimbingan dicatat.', tone: 'success' })
    onClose()
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={entry ? 'Ubah catatan bimbingan' : 'Catat bimbingan'}
      footer={
        <>
          {entry && (
            <Button
              variant="danger"
              icon={Trash2}
              onClick={async () => {
                await db.guidance.delete(entry.id)
                toast({ text: 'Catatan bimbingan dihapus.', action: { label: 'Urungkan', run: () => void db.guidance.put(entry) } })
                onClose()
              }}
            >
              Hapus
            </Button>
          )}
          <Button variant="primary" icon={Check} className="flex-1" onClick={save}>
            Simpan
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Tanggal">
            <input type="date" className="field" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          </Field>
          <Field label="Dosen">
            <input className="field" value={lecturer} onChange={(e) => setLecturer(e.target.value)} placeholder="mis. Bu Rina" />
          </Field>
        </div>
        <Field label="Catatan / masukan umum">
          <textarea className="field min-h-20 resize-y text-sm" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <Field label={entry ? 'Tambah poin revisi' : 'Poin revisi'} hint="Satu baris satu poin.">
          <textarea
            className="field min-h-24 resize-y text-sm"
            value={revText}
            onChange={(e) => setRevText(e.target.value)}
            placeholder={'- perjelas rumusan masalah\n- tambah 3 penelitian terdahulu\n- perbaiki format tabel 3.1'}
          />
        </Field>
        <Toggle label="Jadikan tiap revisi tugas" hint="Prioritas tinggi, tenggat 7 hari setelah bimbingan." checked={makeTasks} onChange={setMakeTasks} />
        {makeTasks && milestones.length > 0 && (
          <Field label="Masukkan ke milestone">
            <select className="field" value={milestoneId ?? ''} onChange={(e) => setMilestoneId(e.target.value || undefined)}>
              <option value="">— Tanpa milestone —</option>
              {milestones.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>
    </Sheet>
  )
}
