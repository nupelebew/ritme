import { Flame } from 'lucide-react'
import { EmptyState, PageHeader } from '@/components/ui'

export function HabitsPage() {
  return (
    <div className="animate-rise">
      <PageHeader title="Kebiasaan" />
      <EmptyState icon={Flame} title="Belum ada kebiasaan" body="Streak dan kalender 30 hari menyusul di tahap 4." />
    </div>
  )
}
