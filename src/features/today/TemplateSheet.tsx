import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { LayoutTemplate, Save, Trash2 } from 'lucide-react'
import { Button, Field, IconButton, Sheet } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { db } from '@/db/db'
import { applyTemplate, saveTemplateFromDay } from '@/db/templates'
import type { DateKey } from '@/db/types'
import { durationLabel, fmt, minToHHMM } from '@/lib/date'
import type { Occurrence } from '@/lib/schedule'

const EMOJI = ['🎓', '💼', '🏠', '🌿', '💑', '🏃', '📚', '☕']

/** Template hari: terapkan pola hari dengan satu ketukan, atau simpan hari ini sebagai template */
export function TemplateSheet({ date, items, onClose }: { date: DateKey; items: Occurrence[]; onClose: () => void }) {
  const toast = useToast()
  const templates = useLiveQuery(() => db.templates.toArray().then((t) => t.sort((a, b) => a.createdAt - b.createdAt)), []) ?? []
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState(EMOJI[0])
  const singles = items.filter((o) => !o.masterId).length

  const apply = async (id: string) => {
    const tpl = templates.find((t) => t.id === id)
    if (!tpl) return
    const r = await applyTemplate(db, tpl, date, items)
    toast({
      text: `${r.created} blok dari "${tpl.name}" ditambahkan${r.skipped ? `, ${r.skipped} dilewati karena bentrok` : ''}.`,
      tone: 'success',
      action: r.created ? { label: 'Urungkan', run: () => void r.undo() } : undefined,
    })
    onClose()
  }

  const save = async () => {
    if (!name.trim()) return
    const tpl = await saveTemplateFromDay(db, date, name.trim(), emoji)
    toast(tpl ? { text: `Template "${tpl.name}" disimpan (${tpl.blocks.length} blok).`, tone: 'success' } : { text: 'Tidak ada kegiatan sekali-jalan untuk disimpan.', tone: 'error' })
    setName('')
  }

  return (
    <Sheet open onClose={onClose} title={`Template · ${fmt(date, 'EEEE, d MMM')}`}>
      <div className="space-y-5">
        {templates.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted">
            <LayoutTemplate className="size-5 text-accent-2" aria-hidden /> Belum ada template. Susun satu hari yang pas, lalu simpan di bawah.
          </p>
        ) : (
          <ul className="space-y-2">
            {templates.map((t) => {
              const total = t.blocks.reduce((a, b) => a + b.end - b.start, 0)
              return (
                <li key={t.id} className="flex items-center gap-2 rounded-2xl border border-line p-1 pl-3">
                  <span className="text-xl" aria-hidden>
                    {t.emoji}
                  </span>
                  <button type="button" onClick={() => apply(t.id)} className="min-h-12 min-w-0 flex-1 text-left">
                    <span className="block font-semibold">{t.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {t.blocks.length} blok · {durationLabel(total)} · {minToHHMM(t.blocks[0]?.start ?? 0)}–{minToHHMM(t.blocks.at(-1)?.end ?? 0)}
                    </span>
                  </button>
                  <IconButton
                    icon={Trash2}
                    label={`Hapus template ${t.name}`}
                    onClick={async () => {
                      await db.templates.delete(t.id)
                      toast({ text: 'Template dihapus.', action: { label: 'Urungkan', run: () => void db.templates.put(t) } })
                    }}
                  />
                </li>
              )
            })}
          </ul>
        )}
        {templates.length > 0 && <p className="-mt-3 text-xs text-faint">Ketuk template untuk menerapkannya ke tanggal ini. Blok yang bentrok dilewati.</p>}

        <div className="space-y-2 border-t border-line pt-4">
          <p className="text-[13px] font-medium text-muted">Simpan tanggal ini sebagai template ({singles} kegiatan sekali-jalan)</p>
          <div className="flex flex-wrap gap-1.5">
            {EMOJI.map((e) => (
              <button
                key={e}
                type="button"
                aria-pressed={emoji === e}
                aria-label={`Emoji ${e}`}
                onClick={() => setEmoji(e)}
                className={`grid size-11 place-items-center rounded-xl border text-lg ${emoji === e ? 'border-accent bg-accent/15' : 'border-line'}`}
              >
                {e}
              </button>
            ))}
          </div>
          <Field label="Nama template">
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Hari kampus" onKeyDown={(e) => e.key === 'Enter' && save()} />
          </Field>
          <Button icon={Save} className="w-full" disabled={!name.trim() || !singles} onClick={save}>
            Simpan sebagai template
          </Button>
        </div>
      </div>
    </Sheet>
  )
}
