import { CalendarDays } from 'lucide-react'
import { BackHeader } from '@/components/BackHeader'
import { EmptyState } from '@/components/ui'

export function HistoryPage() {
  return (
    <div className="animate-rise">
      <BackHeader title="Riwayat & mood" />
      <EmptyState icon={CalendarDays} title="Belum ada riwayat" body="Catatan harian dan mood menyusul di tahap 7." />
    </div>
  )
}
