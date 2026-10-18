import { Timer } from 'lucide-react'
import { EmptyState, PageHeader } from '@/components/ui'

export function FocusPage() {
  return (
    <div className="animate-rise">
      <PageHeader title="Fokus" />
      <EmptyState icon={Timer} title="Timer fokus segera hadir" body="Pomodoro yang tersambung ke tugas menyusul di tahap 5." />
    </div>
  )
}
