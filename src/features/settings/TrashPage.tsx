import { useLiveQuery } from 'dexie-react-hooks'
import { ArchiveRestore, CalendarClock, Circle, Flame, Repeat, Trash2, type LucideIcon } from 'lucide-react'
import { BackHeader } from '@/components/BackHeader'
import { Button, Card, EmptyState } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { db } from '@/db/db'
import { restoreTrash, TRASH_DAYS } from '@/db/trash'
import type { TrashItem } from '@/db/types'

const ICON: Record<TrashItem['kind'], LucideIcon> = { task: Circle, event: CalendarClock, series: Repeat, habit: Flame }
const LABEL: Record<TrashItem['kind'], string> = { task: 'Tugas', event: 'Kegiatan', series: 'Kegiatan berulang', habit: 'Kebiasaan' }

export function TrashPage() {
  const items = useLiveQuery(() => db.trash.orderBy('deletedAt').reverse().toArray(), [])
  const toast = useToast()
  const daysLeft = (t: TrashItem) => Math.max(0, TRASH_DAYS - Math.floor((Date.now() - t.deletedAt) / 86_400_000))

  return (
    <div className="animate-rise space-y-4">
      <BackHeader
        title="Tempat sampah"
        sub={`Yang dihapus disimpan ${TRASH_DAYS} hari, lalu hilang permanen`}
        action={
          items?.length ? (
            <Button
              size="sm"
              variant="danger"
              icon={Trash2}
              onClick={async () => {
                if (!confirm(`Hapus permanen ${items.length} item? Tindakan ini tidak bisa dibatalkan.`)) return
                await db.trash.clear()
                toast({ text: 'Tempat sampah dikosongkan.' })
              }}
            >
              Kosongkan
            </Button>
          ) : undefined
        }
      />
      {items && items.length === 0 && <EmptyState icon={Trash2} title="Kosong" body="Tugas dan kegiatan yang kamu hapus akan muncul di sini dan bisa dipulihkan." />}
      <ul className="space-y-2">
        {items?.map((t) => {
          const Icon = ICON[t.kind]
          return (
            <li key={t.id}>
              <Card className="flex items-center gap-3 p-3">
                <Icon className="size-5 shrink-0 text-muted" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{t.label}</span>
                  <span className="text-xs text-faint">
                    {LABEL[t.kind]} · hilang dalam {daysLeft(t)} hari
                  </span>
                </span>
                <Button
                  size="sm"
                  icon={ArchiveRestore}
                  onClick={async () => {
                    await restoreTrash(db, t)
                    toast({ text: `"${t.label}" dipulihkan.`, tone: 'success' })
                  }}
                >
                  Pulihkan
                </Button>
              </Card>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
