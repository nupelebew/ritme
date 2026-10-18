import { CalendarClock } from 'lucide-react'
import { EmptyState, PageHeader } from '@/components/ui'

export function TodayPage() {
  return (
    <div className="animate-rise">
      <PageHeader title="Hari ini" />
      <EmptyState icon={CalendarClock} title="Timeline segera hadir" body="Di tahap 2 kamu bisa menyusun blok kegiatan per jam di sini." />
    </div>
  )
}
