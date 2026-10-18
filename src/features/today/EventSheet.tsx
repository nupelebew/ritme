import { useState } from 'react'
import { Check, Trash2 } from 'lucide-react'
import { Button, Chip, Field, Sheet } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { db } from '@/db/db'
import { createEvent, deleteOccurrence, updateOccurrence, type Scope } from '@/db/events'
import { useCategories } from '@/db/hooks'
import type { DateKey, Recurrence, Weekday } from '@/db/types'
import { durationLabel, hhmmToMin, minToHHMM } from '@/lib/date'
import type { Occurrence } from '@/lib/schedule'
import { cn } from '@/lib/cn'

type RepeatMode = 'none' | 'daily' | 'weekdays' | 'custom'
const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

function modeOf(r?: Recurrence): RepeatMode {
  if (!r) return 'none'
  if (r.freq === 'daily') return 'daily'
  if ([...(r.days ?? [])].sort().join() === '1,2,3,4,5') return 'weekdays'
  return 'custom'
}

export interface EventDraft {
  date: DateKey
  start: number
  end: number
  categoryId?: string
  title?: string
}

export function EventSheet({
  occurrence,
  draft,
  onClose,
}: {
  occurrence?: Occurrence
  draft?: EventDraft
  onClose: () => void
}) {
  const toast = useToast()
  const { list: categories } = useCategories()
  const src = occurrence ?? draft!
  const isSeries = !!occurrence?.masterId

  const [title, setTitle] = useState(src.title ?? '')
  const [categoryId, setCategoryId] = useState(src.categoryId ?? categories[0]?.id ?? 'skripsi')
  const [date, setDate] = useState(src.date)
  const [start, setStart] = useState(minToHHMM(src.start))
  const [end, setEnd] = useState(minToHHMM(Math.min(src.end, 1440)).replace(/^00:00$/, '24:00'))
  const [notes, setNotes] = useState(occurrence?.notes ?? '')
  const [repeat, setRepeat] = useState<RepeatMode>(modeOf(occurrence?.recurrence))
  const [days, setDays] = useState<Weekday[]>(occurrence?.recurrence?.days ?? [])
  const [until, setUntil] = useState(occurrence?.recurrence?.until ?? '')
  const [scope, setScope] = useState<Scope>('one')

  const s = hhmmToMin(start)
  const e = hhmmToMin(end)
  const timeError = Number.isNaN(s) || Number.isNaN(e) ? 'Format jam belum benar.' : e <= s ? 'Jam selesai harus setelah jam mulai.' : ''
  const canSave = title.trim() && !timeError && (repeat !== 'custom' || days.length > 0)

  const recurrence = (): Recurrence | undefined => {
    const u = until || undefined
    if (repeat === 'daily') return { freq: 'daily', until: u }
    if (repeat === 'weekdays') return { freq: 'weekly', days: [1, 2, 3, 4, 5], until: u }
    if (repeat === 'custom') return { freq: 'weekly', days: [...days].sort() as Weekday[], until: u }
    return undefined
  }

  // Pengaturan pengulangan hanya bisa diubah untuk kegiatan tunggal atau saat mengubah semua seri
  const showRepeat = !isSeries || scope === 'all'

  const setDuration = (min: number) => {
    if (!Number.isNaN(s)) setEnd(minToHHMM(Math.min(s + min, 1440)).replace(/^00:00$/, '24:00'))
  }

  const save = async () => {
    if (!canSave) return
    const base = { title: title.trim(), categoryId, start: s, end: e, notes: notes.trim() || undefined }
    if (!occurrence) {
      await createEvent(db, { ...base, date, recurrence: recurrence() })
      toast({ text: 'Kegiatan ditambahkan.' })
    } else if (isSeries) {
      await updateOccurrence(db, occurrence, scope === 'all' ? { ...base, recurrence: recurrence() } : { ...base, date }, scope)
      toast({ text: scope === 'all' ? 'Semua jadwal berulang diperbarui.' : 'Jadwal hari ini diperbarui.' })
    } else {
      await updateOccurrence(db, occurrence, { ...base, date, recurrence: recurrence() })
      toast({ text: 'Kegiatan disimpan.' })
    }
    onClose()
  }

  const remove = async () => {
    if (!occurrence) return
    const undo = await deleteOccurrence(db, occurrence, scope)
    toast({ text: 'Kegiatan dihapus.', action: { label: 'Urungkan', run: undo } })
    onClose()
  }

  const repeatOptions: { v: RepeatMode; label: string }[] = [
    { v: 'none', label: 'Sekali' },
    { v: 'daily', label: 'Setiap hari' },
    { v: 'weekdays', label: 'Hari kerja' },
    { v: 'custom', label: 'Pilih hari' },
  ]

  return (
    <Sheet
      open
      onClose={onClose}
      title={occurrence ? 'Ubah kegiatan' : 'Kegiatan baru'}
      footer={
        <>
          {occurrence && (
            <Button variant="danger" icon={Trash2} onClick={remove}>
              Hapus
            </Button>
          )}
          <Button variant="primary" icon={Check} className="flex-1" disabled={!canSave} onClick={save}>
            {occurrence ? 'Simpan perubahan' : 'Tambah ke jadwal'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {isSeries && (
          <div className="rounded-2xl border border-line p-1">
            <div role="radiogroup" aria-label="Terapkan perubahan ke" className="grid grid-cols-2 gap-1">
              {(['one', 'all'] as Scope[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={scope === v}
                  onClick={() => setScope(v)}
                  className={cn('min-h-11 rounded-xl text-sm transition', scope === v ? 'bg-white/12 font-semibold text-ink' : 'text-muted')}
                >
                  {v === 'one' ? 'Hari ini saja' : 'Semua jadwal berulang'}
                </button>
              ))}
            </div>
          </div>
        )}

        <Field label="Nama kegiatan">
          <input
            className="field"
            value={title}
            maxLength={80}
            placeholder="mis. Revisi bab 2"
            onChange={(ev) => setTitle(ev.target.value)}
            onKeyDown={(ev) => ev.key === 'Enter' && save()}
          />
        </Field>

        <div className="space-y-1.5">
          <span className="text-[13px] font-medium text-muted">Kategori</span>
          <div className="scroll-thin -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {categories.map((c) => (
              <Chip key={c.id} active={categoryId === c.id} color={c.color} onClick={() => setCategoryId(c.id)}>
                {c.name}
              </Chip>
            ))}
          </div>
        </div>

        <Field label="Tanggal">
          <input
            type="date"
            className="field"
            value={date}
            disabled={isSeries && scope === 'all'}
            onChange={(ev) => ev.target.value && setDate(ev.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Mulai">
            <input type="time" className="field min-w-0" step={300} value={start} onChange={(ev) => setStart(ev.target.value)} />
          </Field>
          <Field label="Selesai">
            <input
              type="time"
              className="field min-w-0"
              step={300}
              value={end === '24:00' ? '23:59' : end}
              onChange={(ev) => setEnd(ev.target.value)}
            />
          </Field>
        </div>
        <div className="-mt-2 flex flex-wrap items-center gap-2">
          {[30, 60, 90, 120].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setDuration(m)}
              className={cn(
                'min-h-11 rounded-full border px-3 text-[13px] transition',
                !timeError && e - s === m ? 'border-accent-2 text-ink' : 'border-line text-muted hover:text-ink',
              )}
            >
              {durationLabel(m)}
            </button>
          ))}
          {timeError ? (
            <span className="text-xs text-danger" role="alert">
              {timeError}
            </span>
          ) : (
            <span className="text-xs text-faint">Durasi {durationLabel(e - s)}</span>
          )}
        </div>

        {showRepeat && (
          <div className="space-y-2">
            <span className="text-[13px] font-medium text-muted">Ulangi</span>
            <div className="flex flex-wrap gap-2">
              {repeatOptions.map((o) => (
                <Chip key={o.v} active={repeat === o.v} onClick={() => setRepeat(o.v)}>
                  {o.label}
                </Chip>
              ))}
            </div>
            {repeat === 'custom' && (
              <div className="grid grid-cols-7 gap-1.5 pt-1">
                {DAY_NAMES.map((n, i) => {
                  const on = days.includes(i as Weekday)
                  return (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setDays(on ? days.filter((d) => d !== i) : [...days, i as Weekday])}
                      className={cn(
                        'min-h-11 rounded-xl border text-[13px] transition',
                        on ? 'border-accent bg-accent/20 font-semibold text-ink' : 'border-line text-muted',
                      )}
                    >
                      {n}
                    </button>
                  )
                })}
              </div>
            )}
            {repeat !== 'none' && (
              <Field label="Berhenti pada (opsional)">
                <input type="date" className="field" min={date} value={until} onChange={(ev) => setUntil(ev.target.value)} />
              </Field>
            )}
          </div>
        )}

        <Field label="Catatan (opsional)">
          <textarea className="field min-h-20 resize-y" value={notes} onChange={(ev) => setNotes(ev.target.value)} placeholder="Link meet, bahan yang perlu dibawa…" />
        </Field>
      </div>
    </Sheet>
  )
}
