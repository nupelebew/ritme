import { useCallback, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarHeart, CalendarPlus, Check, ClipboardCopy, Dices, Heart, ListPlus, Plus, QrCode as QrIcon, ScanLine, Trash2, Type } from 'lucide-react'
import { BackHeader } from '@/components/BackHeader'
import { QrCode, QrScanner } from '@/components/Qr'
import { Button, Card, Field, IconButton, Sheet, Toggle } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { db, uid } from '@/db/db'
import { useCategories } from '@/db/hooks'
import { useSettings } from '@/db/settings'
import { addTask } from '@/db/tasks'
import { busyDays } from '@/db/together'
import type { DateIdea, SpecialDate } from '@/db/types'
import { copyText } from '@/lib/clipboard'
import { durationLabel, fmt, minToHHMM, nowMinutes, todayKey } from '@/lib/date'
import { useNow } from '@/lib/useNow'
import { matchCategory } from '@/lib/plan/schema'
import { daysLabel, nextOccurrence } from '@/lib/specialDates'
import { decodeBusy, encodeBusy, freeTogether, type DayBusy } from '@/lib/together'
import { cn } from '@/lib/cn'
import { EventSheet, type EventDraft } from '@/features/today/EventSheet'

type Mode = 'mine' | 'scan' | 'paste'

export function CouplePage() {
  const today = todayKey()
  const s = useSettings()
  const toast = useToast()
  const { list: categories } = useCategories()
  const coupleCat = matchCategory('Pasangan', categories)?.id ?? categories[0]?.id ?? 'pasangan'
  const nowMin = nowMinutes(useNow(5 * 60_000))
  const mine = useLiveQuery(() => busyDays(db, today, 7, nowMin), [today, Math.floor(nowMin / 15)])
  const special = useLiveQuery(() => db.specialDates.toArray(), []) ?? []
  const ideas = useLiveQuery(() => db.dateIdeas.toArray(), []) ?? []

  const [mode, setMode] = useState<Mode>('mine')
  const [theirs, setTheirs] = useState<{ name: string; days: DayBusy[] } | null>(null)
  const [paste, setPaste] = useState('')
  const [draft, setDraft] = useState<EventDraft | null>(null)
  const [sd, setSd] = useState<SpecialDate | 'new' | null>(null)
  const [idea, setIdea] = useState('')
  const [picked, setPicked] = useState<string | null>(null)

  const code = mine ? encodeBusy(mine, s.name || 'Aku') : ''
  const accept = useCallback((t: string) => !!decodeBusy(t), [])
  const onScan = useCallback((t: string) => setTheirs(decodeBusy(t)), [])
  const together = theirs && mine ? freeTogether(mine, theirs.days, s.dayStartHour * 60 + 60, Math.min(22 * 60, s.dayEndHour * 60)) : []

  const upcoming = special.map((x) => ({ x, n: nextOccurrence(x, today) })).sort((a, b) => a.n.days - b.n.days)
  const openIdeas = ideas.filter((i) => !i.done)

  return (
    <div className="animate-rise space-y-4">
      <BackHeader title="Bareng Pasangan" sub="Waktu bareng, tanggal penting, ide kencan" />

      {/* Cari waktu bareng */}
      <Card className="space-y-3">
        <h2 className="flex items-center gap-2 font-display font-semibold">
          <Heart className="size-4 text-[#c026d3]" aria-hidden /> Cari waktu bareng
        </h2>
        <p className="text-[13px] text-muted">Tukar kode jadwal 7 hari ke depan. Yang dibagikan hanya jam sibuk, bukan isi kegiatan. Semua di HP, tanpa internet.</p>
        <div role="tablist" className="grid grid-cols-3 gap-1 rounded-2xl bg-white/5 p-1">
          {(
            [
              ['mine', 'QR-ku', QrIcon],
              ['scan', 'Pindai', ScanLine],
              ['paste', 'Tempel', Type],
            ] as const
          ).map(([m, label, Icon]) => (
            <button
              key={m}
              role="tab"
              type="button"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={cn('flex min-h-11 items-center justify-center gap-1.5 rounded-xl text-[13px]', mode === m ? 'bg-white/12 font-semibold' : 'text-muted')}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </button>
          ))}
        </div>

        {mode === 'mine' && code && (
          <div className="space-y-2">
            <QrCode text={code} label="Kode QR jadwal sibukku" />
            <Button
              size="sm"
              icon={ClipboardCopy}
              className="w-full"
              onClick={async () => toast((await copyText(code)) ? { text: 'Kode tersalin. Kirim ke pasangan lewat chat.', tone: 'success' } : { text: 'Gagal menyalin.', tone: 'error' })}
            >
              Salin kode (untuk dikirim lewat chat)
            </Button>
          </div>
        )}
        {mode === 'scan' && !theirs && <QrScanner accept={accept} onResult={onScan} />}
        {mode === 'paste' && (
          <div className="space-y-2">
            <textarea className="field min-h-20 font-mono text-xs" value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="RITME1|…" spellCheck={false} />
            <Button
              size="sm"
              className="w-full"
              disabled={!paste.trim()}
              onClick={() => {
                const d = decodeBusy(paste)
                if (d) setTheirs(d)
                else toast({ text: 'Kode tidak dikenali. Pastikan disalin utuh dari Ritme.', tone: 'error' })
              }}
            >
              Bandingkan jadwal
            </Button>
          </div>
        )}

        {theirs && (
          <div className="space-y-2 border-t border-line pt-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Kosong bareng {theirs.name}</p>
              <Button size="sm" variant="ghost" onClick={() => setTheirs(null)}>
                Reset
              </Button>
            </div>
            {together.length === 0 ? (
              <p className="text-sm text-muted">Belum ada slot kosong bersama ≥ 1 jam di 7 hari ini. 😢</p>
            ) : (
              <ul className="space-y-1.5">
                {together.map((d) => (
                  <li key={d.date} className="rounded-2xl border border-line p-2.5">
                    <p className="text-[13px] font-semibold">{fmt(d.date, 'EEEE, d MMM')}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {d.slots.map(([a, b]) => (
                        <button
                          key={a}
                          type="button"
                          onClick={() => setDraft({ date: d.date, start: a, end: Math.min(b, a + 120), categoryId: coupleCat, title: `Waktu bareng ${theirs.name}` })}
                          className="flex min-h-11 items-center gap-1.5 rounded-xl bg-[#c026d3]/15 px-3 text-[13px] hover:bg-[#c026d3]/25"
                        >
                          <CalendarPlus className="size-4" aria-hidden />
                          {minToHHMM(a)}–{minToHHMM(b)} <span className="text-faint">· {durationLabel(b - a)}</span>
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-faint">Ketuk slot untuk menjadwalkannya. Kirim juga kodemu ke pasangan supaya dia bisa melihat hal yang sama.</p>
          </div>
        )}
      </Card>

      {/* Tanggal penting */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">Tanggal penting</h2>
          <Button size="sm" variant="ghost" icon={Plus} onClick={() => setSd('new')}>
            Tambah
          </Button>
        </div>
        {upcoming.length === 0 ? (
          <Card className="flex items-center gap-3 text-sm text-muted">
            <CalendarHeart className="size-5 shrink-0 text-[#c026d3]" aria-hidden />
            Anniversary, ulang tahun pasangan, wisuda… Ritme menghitung mundur dan mengingatkan.
          </Card>
        ) : (
          <ul className="glass divide-y divide-line rounded-3xl">
            {upcoming.map(({ x, n }) => (
              <li key={x.id}>
                <button type="button" onClick={() => setSd(x)} className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left hover:bg-white/5">
                  <span className="text-2xl" aria-hidden>
                    {x.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{x.title}</span>
                    <span className="block text-xs text-muted">
                      {fmt(n.date, 'EEEE, d MMMM yyyy')}
                      {x.yearly && n.years > 0 ? ` · ke-${n.years}` : ''}
                    </span>
                  </span>
                  <span className={cn('text-right text-sm font-semibold', n.days <= 7 && 'text-[#c026d3]')}>{daysLabel(n.days)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Ide kencan */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">Ide kencan · {openIdeas.length}</h2>
          <Button
            size="sm"
            variant="ghost"
            icon={Dices}
            disabled={!openIdeas.length}
            onClick={() => setPicked(openIdeas[Math.floor(Math.random() * openIdeas.length)].id)}
          >
            Acak
          </Button>
        </div>
        <Card className="space-y-2 p-3">
          <div className="flex gap-2">
            <input
              className="field"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="mis. Piknik sore di taman kota"
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && idea.trim()) {
                  await db.dateIdeas.add({ id: uid(), title: idea.trim(), done: false, createdAt: Date.now() })
                  setIdea('')
                }
              }}
            />
            <Button
              icon={Plus}
              aria-label="Tambah ide"
              disabled={!idea.trim()}
              onClick={async () => {
                await db.dateIdeas.add({ id: uid(), title: idea.trim(), done: false, createdAt: Date.now() })
                setIdea('')
              }}
            />
          </div>
          {ideas.length > 0 && (
            <ul className="divide-y divide-line">
              {[...ideas].sort((a, b) => Number(a.done) - Number(b.done) || b.createdAt - a.createdAt).map((i: DateIdea) => (
                <li key={i.id} className={cn('flex items-center gap-1 rounded-xl', picked === i.id && 'bg-[#c026d3]/15 ring-1 ring-[#c026d3]')}>
                  <IconButton
                    icon={Check}
                    label={i.done ? `Batal: ${i.title}` : `Sudah: ${i.title}`}
                    className={i.done ? 'text-accent-3' : ''}
                    onClick={() => db.dateIdeas.update(i.id, { done: !i.done })}
                  />
                  <span className={cn('min-w-0 flex-1 text-sm', i.done && 'text-faint line-through')}>{i.title}</span>
                  {!i.done && (
                    <IconButton
                      icon={ListPlus}
                      label={`Jadikan tugas: ${i.title}`}
                      onClick={async () => {
                        await addTask({ title: i.title, categoryId: coupleCat, priority: 2 })
                        toast({ text: 'Masuk ke daftar tugas.', tone: 'success' })
                      }}
                    />
                  )}
                  <IconButton icon={Trash2} label={`Hapus ide ${i.title}`} onClick={() => db.dateIdeas.delete(i.id)} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {draft && <EventSheet key={`${draft.date}-${draft.start}`} draft={draft} onClose={() => setDraft(null)} />}
      {sd && <SpecialSheet key={sd === 'new' ? 'new' : sd.id} item={sd === 'new' ? undefined : sd} onClose={() => setSd(null)} />}
    </div>
  )
}

const EMOJI = ['💑', '🎂', '💍', '🎓', '🌹', '✈️', '🎉', '⭐']

function SpecialSheet({ item, onClose }: { item?: SpecialDate; onClose: () => void }) {
  const toast = useToast()
  const [title, setTitle] = useState(item?.title ?? '')
  const [emoji, setEmoji] = useState(item?.emoji ?? EMOJI[0])
  const [date, setDate] = useState(item?.date ?? todayKey())
  const [yearly, setYearly] = useState(item?.yearly ?? true)
  const save = async () => {
    if (!title.trim()) return
    const data = { title: title.trim(), emoji, date, yearly }
    if (item) await db.specialDates.update(item.id, data)
    else await db.specialDates.add({ ...data, id: uid(), createdAt: Date.now() })
    onClose()
  }
  return (
    <Sheet
      open
      onClose={onClose}
      title={item ? 'Ubah tanggal penting' : 'Tanggal penting'}
      footer={
        <>
          {item && (
            <Button
              variant="danger"
              icon={Trash2}
              onClick={async () => {
                await db.specialDates.delete(item.id)
                toast({ text: 'Dihapus.', action: { label: 'Urungkan', run: () => void db.specialDates.put(item) } })
                onClose()
              }}
            >
              Hapus
            </Button>
          )}
          <Button variant="primary" icon={Check} className="flex-1" disabled={!title.trim()} onClick={save}>
            Simpan
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {EMOJI.map((e) => (
            <button key={e} type="button" aria-label={`Emoji ${e}`} aria-pressed={emoji === e} onClick={() => setEmoji(e)} className={`grid size-11 place-items-center rounded-xl border text-lg ${emoji === e ? 'border-accent bg-accent/15' : 'border-line'}`}>
              {e}
            </button>
          ))}
        </div>
        <Field label="Nama">
          <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="mis. Anniversary" />
        </Field>
        <Field label={yearly ? 'Tanggal (tahun pertama)' : 'Tanggal'}>
          <input type="date" className="field" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </Field>
        <Toggle label="Berulang tiap tahun" hint="Untuk anniversary & ulang tahun. Ritme menghitung ini tahun ke-berapa." checked={yearly} onChange={setYearly} />
      </div>
    </Sheet>
  )
}
