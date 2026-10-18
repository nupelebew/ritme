import { useState } from 'react'
import { Archive, Check, Plus } from 'lucide-react'
import { Button, Chip, Field, Sheet } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { db, uid } from '@/db/db'
import type { Habit, Weekday } from '@/db/types'
import { PALETTE } from '@/lib/icons'
import { cn } from '@/lib/cn'

const EMOJIS = ['📚', '💧', '🏃', '🧘', '🛏️', '🍎', '✍️', '💊', '🧹', '🙏', '📵', '💪', '🎸', '🌱', '☀️', '💑', '🧠', '🎯']
const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

export function HabitSheet({ habit, onClose }: { habit?: Habit; onClose: () => void }) {
  const toast = useToast()
  const [name, setName] = useState(habit?.name ?? '')
  const [emoji, setEmoji] = useState(habit?.emoji ?? EMOJIS[0])
  const [color, setColor] = useState(habit?.color ?? PALETTE[4])
  const [days, setDays] = useState<Weekday[]>(habit?.days ?? [])

  const save = async () => {
    const n = name.trim()
    if (!n) return
    const data = { name: n, emoji: emoji.trim() || '✨', color, days: days.length && days.length < 7 ? [...days].sort() : undefined }
    if (habit) await db.habits.update(habit.id, data)
    else {
      const last = await db.habits.orderBy('order').last()
      await db.habits.add({ ...data, id: uid(), order: (last?.order ?? 0) + 1, createdAt: Date.now() })
    }
    toast({ text: habit ? 'Kebiasaan disimpan.' : `Kebiasaan "${n}" dimulai. Semangat!` })
    onClose()
  }

  const archive = async () => {
    if (!habit) return
    await db.habits.update(habit.id, { archived: true })
    toast({
      text: `"${habit.name}" diarsipkan.`,
      action: { label: 'Urungkan', run: () => void db.habits.update(habit.id, { archived: false }) },
    })
    onClose()
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={habit ? 'Ubah kebiasaan' : 'Kebiasaan baru'}
      footer={
        <>
          {habit && (
            <Button variant="danger" icon={Archive} onClick={archive}>
              Arsipkan
            </Button>
          )}
          <Button variant="primary" icon={habit ? Check : Plus} className="flex-1" disabled={!name.trim()} onClick={save}>
            {habit ? 'Simpan' : 'Mulai kebiasaan'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Nama kebiasaan">
          <input
            className="field"
            value={name}
            maxLength={40}
            placeholder="mis. Baca jurnal 20 menit"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
        </Field>

        <div className="space-y-2">
          <span className="text-[13px] font-medium text-muted">Ikon</span>
          <div className="grid grid-cols-6 gap-2">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                aria-label={`Emoji ${e}`}
                aria-pressed={emoji === e}
                onClick={() => setEmoji(e)}
                className={cn(
                  'grid aspect-square min-h-11 place-items-center rounded-2xl border text-2xl transition',
                  emoji === e ? 'border-accent bg-accent/15' : 'border-line hover:bg-white/5',
                )}
              >
                {e}
              </button>
            ))}
          </div>
          <input
            className="field"
            aria-label="Emoji lain"
            placeholder="atau ketik emoji lain"
            maxLength={4}
            value={EMOJIS.includes(emoji) ? '' : emoji}
            onChange={(e) => e.target.value && setEmoji(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <span className="text-[13px] font-medium text-muted">Warna</span>
          <div className="flex flex-wrap gap-2">
            {PALETTE.map((p) => (
              <button
                key={p}
                type="button"
                aria-label={`Warna ${p}`}
                aria-pressed={color === p}
                onClick={() => setColor(p)}
                className="grid size-11 place-items-center rounded-2xl"
                style={{ background: p }}
              >
                {color === p && <Check className="size-5 text-white drop-shadow" aria-hidden />}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-[13px] font-medium text-muted">Jadwal</span>
          <div className="flex flex-wrap gap-2">
            <Chip active={!days.length || days.length === 7} onClick={() => setDays([])}>
              Setiap hari
            </Chip>
            <Chip active={[...days].sort().join() === '1,2,3,4,5'} onClick={() => setDays([1, 2, 3, 4, 5])}>
              Hari kerja
            </Chip>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {DAY_NAMES.map((n, i) => {
              const on = !days.length || days.includes(i as Weekday)
              return (
                <button
                  key={n}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    const base: Weekday[] = days.length ? days : [0, 1, 2, 3, 4, 5, 6]
                    const next = on ? base.filter((d) => d !== i) : [...base, i as Weekday]
                    if (next.length) setDays(next.length === 7 ? [] : next)
                  }}
                  className={cn(
                    'min-h-11 rounded-xl border text-[13px] transition',
                    on ? 'border-transparent font-semibold text-ink' : 'border-line text-faint',
                  )}
                  style={on ? { background: `color-mix(in srgb, ${color} 25%, transparent)` } : undefined}
                >
                  {n}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </Sheet>
  )
}
