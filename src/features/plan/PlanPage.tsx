import { Sparkles } from 'lucide-react'
import { BackHeader } from '@/components/BackHeader'
import { EmptyState } from '@/components/ui'

export function PlanPage() {
  return (
    <div className="animate-rise">
      <BackHeader title="Rencana besok" />
      <EmptyState icon={Sparkles} title="Segera hadir" body="Brain dump dan prompt AI menyusul di tahap 6." />
    </div>
  )
}
