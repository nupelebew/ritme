import { useState } from 'react'
import { ArchiveRestore, ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2 } from 'lucide-react'
import { BackHeader } from '@/components/BackHeader'
import { Button, Card, Field, IconButton, Sheet } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { db, uid } from '@/db/db'
import { useAllCategories } from '@/db/hooks'
import type { Category } from '@/db/types'
import { CATEGORY_ICONS, PALETTE, alpha, iconFor } from '@/lib/icons'
import { cn } from '@/lib/cn'

async function usageCount(id: string) {
  const [e, t, h, s] = await Promise.all([
    db.events.where('categoryId').equals(id).count(),
    db.tasks.where('categoryId').equals(id).count(),
    db.habits.filter((x) => x.categoryId === id).count(),
    db.sessions.where('categoryId').equals(id).count(),
  ])
  return e + t + h + s
}

export function CategoriesPage() {
  const all = useAllCategories()
  const active = all.filter((c) => !c.archived)
  const archived = all.filter((c) => c.archived)
  const [editing, setEditing] = useState<Category | 'new' | null>(null)
  const toast = useToast()

  const move = async (idx: number, dir: -1 | 1) => {
    const a = active[idx]
    const b = active[idx + dir]
    if (!a || !b) return
    await db.transaction('rw', db.categories, async () => {
      await db.categories.update(a.id, { order: b.order })
      await db.categories.update(b.id, { order: a.order })
    })
  }

  return (
    <div className="animate-rise">
      <BackHeader
        title="Kategori"
        sub="Warna kategori dipakai di timeline dan statistik"
        action={
          <Button variant="primary" icon={Plus} onClick={() => setEditing('new')}>
            Tambah
          </Button>
        }
      />

      <ul className="space-y-2">
        {active.map((c, i) => {
          const Icon = iconFor(c.icon)
          return (
            <li key={c.id}>
              <Card className="flex items-center gap-3 p-2.5 pl-3">
                <span
                  className="grid size-11 shrink-0 place-items-center rounded-2xl"
                  style={{ background: alpha(c.color, 0.2), color: c.color }}
                >
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 break-words font-medium leading-tight">{c.name}</span>
                <IconButton icon={ArrowUp} label={`Naikkan ${c.name}`} disabled={i === 0} onClick={() => move(i, -1)} className="disabled:opacity-25" />
                <IconButton
                  icon={ArrowDown}
                  label={`Turunkan ${c.name}`}
                  disabled={i === active.length - 1}
                  onClick={() => move(i, 1)}
                  className="disabled:opacity-25"
                />
                <IconButton icon={Pencil} label={`Ubah ${c.name}`} onClick={() => setEditing(c)} />
              </Card>
            </li>
          )
        })}
      </ul>

      {archived.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.14em] text-faint">Diarsipkan</h2>
          <ul className="space-y-2">
            {archived.map((c) => (
              <li key={c.id}>
                <Card className="flex items-center gap-3 p-2.5 pl-4 opacity-70">
                  <span className="size-3 rounded-full" style={{ background: c.color }} aria-hidden />
                  <span className="flex-1 truncate">{c.name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={ArchiveRestore}
                    onClick={async () => {
                      const max = Math.max(0, ...active.map((x) => x.order))
                      await db.categories.update(c.id, { archived: false, order: max + 1 })
                      toast({ text: `${c.name} dipulihkan.` })
                    }}
                  >
                    Pulihkan
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      {editing && (
        <CategoryEditor
          key={editing === 'new' ? 'new' : editing.id}
          initial={editing === 'new' ? undefined : editing}
          nextOrder={Math.max(0, ...all.map((c) => c.order)) + 1}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

function CategoryEditor({ initial, nextOrder, onClose }: { initial?: Category; nextOrder: number; onClose: () => void }) {
  const toast = useToast()
  const [name, setName] = useState(initial?.name ?? '')
  const [color, setColor] = useState(initial?.color ?? PALETTE[0])
  const [icon, setIcon] = useState(initial?.icon ?? 'sparkles')

  const save = async () => {
    const n = name.trim()
    if (!n) return
    if (initial) await db.categories.update(initial.id, { name: n, color, icon })
    else await db.categories.add({ id: uid(), name: n, color, icon, order: nextOrder })
    toast({ text: initial ? 'Kategori disimpan.' : `Kategori ${n} ditambahkan.` })
    onClose()
  }

  const remove = async () => {
    if (!initial) return
    const used = await usageCount(initial.id)
    if (used > 0) {
      await db.categories.update(initial.id, { archived: true })
      toast({ text: `${initial.name} diarsipkan (masih dipakai di ${used} data).` })
    } else {
      await db.categories.delete(initial.id)
      toast({ text: `${initial.name} dihapus.` })
    }
    onClose()
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={initial ? 'Ubah kategori' : 'Kategori baru'}
      footer={
        <>
          {initial && (
            <Button variant="danger" icon={Trash2} onClick={remove}>
              Hapus
            </Button>
          )}
          <Button variant="primary" icon={Check} className="flex-1" disabled={!name.trim()} onClick={save}>
            Simpan kategori
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Nama">
          <input
            className="field"
            value={name}
            maxLength={30}
            placeholder="mis. Olahraga"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
        </Field>

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
                className={cn('grid size-11 place-items-center rounded-2xl transition', color === p && 'ring-2 ring-ink ring-offset-2 ring-offset-transparent')}
                style={{ background: p }}
              >
                {color === p && <Check className="size-5 text-white drop-shadow" aria-hidden />}
              </button>
            ))}
            <label className="relative grid size-11 cursor-pointer place-items-center rounded-2xl border border-dashed border-line text-xs text-muted">
              Lain
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label="Pilih warna lain"
              />
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-[13px] font-medium text-muted">Ikon</span>
          <div className="grid grid-cols-6 gap-2">
            {Object.entries(CATEGORY_ICONS).map(([k, Icon]) => (
              <button
                key={k}
                type="button"
                aria-label={`Ikon ${k}`}
                aria-pressed={icon === k}
                onClick={() => setIcon(k)}
                className="grid aspect-square min-h-11 place-items-center rounded-2xl border transition"
                style={
                  icon === k
                    ? { background: alpha(color, 0.22), borderColor: color, color }
                    : { borderColor: 'var(--line)', color: 'var(--muted)' }
                }
              >
                <Icon className="size-5" aria-hidden />
              </button>
            ))}
          </div>
        </div>
      </div>
    </Sheet>
  )
}
