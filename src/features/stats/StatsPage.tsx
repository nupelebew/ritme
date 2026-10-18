import { BarChart3 } from 'lucide-react'
import { BackHeader } from '@/components/BackHeader'
import { EmptyState } from '@/components/ui'

export function StatsPage() {
  return (
    <div className="animate-rise">
      <BackHeader title="Statistik" />
      <EmptyState icon={BarChart3} title="Belum ada data" body="Dasbor statistik menyusul di tahap 7." />
    </div>
  )
}
