import { NotebookPen } from 'lucide-react'
import { BackHeader } from '@/components/BackHeader'
import { EmptyState } from '@/components/ui'

export function ReviewPage() {
  return (
    <div className="animate-rise">
      <BackHeader title="Rekap mingguan" />
      <EmptyState icon={NotebookPen} title="Segera hadir" body="Prompt evaluasi mingguan menyusul di tahap 6." />
    </div>
  )
}
