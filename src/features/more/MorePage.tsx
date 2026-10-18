import { Link } from 'react-router'
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  NotebookPen,
  Palette,
  Settings2,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { PageHeader } from '@/components/ui'

const groups: { title: string; items: { to: string; label: string; desc: string; icon: LucideIcon; tint: string }[] }[] = [
  {
    title: 'Rencanakan',
    items: [
      { to: '/rencana', label: 'Rencana besok', desc: 'Brain dump, lalu susun pakai AI atau otomatis', icon: Sparkles, tint: 'var(--accent)' },
      { to: '/rekap', label: 'Rekap mingguan', desc: 'Evaluasi minggu ini, siap ditanyakan ke Claude', icon: NotebookPen, tint: 'var(--accent-2)' },
    ],
  },
  {
    title: 'Track record',
    items: [
      { to: '/statistik', label: 'Statistik', desc: 'Jam fokus, tugas selesai, tren, heatmap', icon: BarChart3, tint: 'var(--accent-3)' },
      { to: '/riwayat', label: 'Riwayat & mood', desc: 'Catatan harian dan mood 1–5', icon: CalendarDays, tint: '#f472b6' },
    ],
  },
  {
    title: 'Atur',
    items: [
      { to: '/kategori', label: 'Kategori', desc: 'Ubah nama, warna, dan urutan', icon: Palette, tint: '#f59e0b' },
      { to: '/pengaturan', label: 'Pengaturan', desc: 'Tema, timer, pengingat, ekspor/impor', icon: Settings2, tint: 'var(--muted)' },
    ],
  },
]

export function MorePage() {
  return (
    <div className="animate-rise">
      <PageHeader eyebrow="Semua alat" title="Lainnya" />
      <div className="space-y-6">
        {groups.map((g) => (
          <section key={g.title}>
            <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.14em] text-faint">{g.title}</h2>
            <ul className="glass divide-y divide-line overflow-hidden rounded-3xl">
              {g.items.map(({ to, label, desc, icon: Icon, tint }) => (
                <li key={to}>
                  <Link to={to} className="flex min-h-16 items-center gap-3 px-4 py-3 transition hover:bg-white/5">
                    <span
                      className="grid size-10 shrink-0 place-items-center rounded-2xl"
                      style={{ background: `color-mix(in srgb, ${tint} 18%, transparent)`, color: tint }}
                    >
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{label}</span>
                      <span className="block truncate text-[13px] text-muted">{desc}</span>
                    </span>
                    <ChevronRight className="size-5 text-faint" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="mt-8 text-center text-xs text-faint">
        Ritme · semua data tersimpan di perangkat ini, tanpa server.
      </p>
    </div>
  )
}
