import { useLiveQuery } from 'dexie-react-hooks'
import { Clock, Gauge } from 'lucide-react'
import { Card } from '@/components/ui'
import { db } from '@/db/db'
import { loadInsights } from '@/db/insights'
import { durationLabel, todayKey } from '@/lib/date'
import { cn } from '@/lib/cn'

const hh = (h: number) => `${String(h).padStart(2, '0')}.00`

/** Jam paling produktif & seberapa meleset estimasi tugasmu */
export function InsightsCard() {
  const data = useLiveQuery(() => loadInsights(db, todayKey()), [])
  if (!data) return null
  const { golden, estimate } = data
  const hours = golden.byHour.slice(5, 24)
  const max = Math.max(1, ...hours)

  return (
    <Card className="space-y-4">
      <div className="space-y-2">
        <h2 className="flex items-center gap-2 font-display font-semibold">
          <Clock className="size-4 text-accent" aria-hidden /> Jam emas
        </h2>
        {golden.confident ? (
          <p className="text-sm text-muted">
            Kamu paling fokus sekitar <b className="text-ink">{hh(golden.window[0])}–{hh(golden.window[1])}</b>. Penyusun jadwal otomatis menaruh tugas penting di jam ini.
          </p>
        ) : (
          <p className="text-sm text-muted">Butuh minimal 8 sesi fokus (60 hari terakhir) untuk menebak jam emasmu.</p>
        )}
        <div className="flex h-16 items-end gap-[2px]" role="img" aria-label="Menit fokus per jam, 05.00 sampai 23.00">
          {hours.map((m, k) => {
            const h = k + 5
            const gold = golden.confident && h >= golden.window[0] && h < golden.window[1]
            return (
              <span
                key={h}
                title={`${hh(h)}: ${durationLabel(m)}`}
                className={cn('flex-1 rounded-t-[3px]', gold ? 'bg-accent' : 'bg-white/15')}
                style={{ height: `${Math.max(m ? 6 : 2, (m / max) * 100)}%` }}
              />
            )
          })}
        </div>
        <div className="flex justify-between text-[10px] text-faint">
          <span>05</span>
          <span>12</span>
          <span>18</span>
          <span>23</span>
        </div>
      </div>

      <div className="space-y-1 border-t border-line pt-3">
        <h2 className="flex items-center gap-2 font-display font-semibold">
          <Gauge className="size-4 text-accent-2" aria-hidden /> Estimasi vs kenyataan
        </h2>
        {estimate && estimate.samples >= 3 ? (
          <p className="text-sm text-muted">
            Dari {estimate.samples} tugas, waktu nyatanya rata-rata <b className="text-ink">{estimate.ratio.toLocaleString('id-ID')}×</b> estimasimu
            {estimate.ratio > 1.15 ? ' — kamu cenderung terlalu optimis. Estimasi baru otomatis disesuaikan.' : estimate.ratio < 0.85 ? ' — kamu lebih cepat dari perkiraan!' : ' — estimasimu sudah jitu.'}
          </p>
        ) : (
          <p className="text-sm text-muted">Isi perkiraan waktu di tugas, lalu kerjakan dengan timer fokus. Setelah 3 tugas, Ritme bisa menghitung seberapa meleset estimasimu.</p>
        )}
      </div>
    </Card>
  )
}
