import { ListChecks } from 'lucide-react'
import { EmptyState, PageHeader } from '@/components/ui'

export function TasksPage() {
  return (
    <div className="animate-rise">
      <PageHeader title="Tugas" />
      <EmptyState icon={ListChecks} title="Belum ada tugas" body="Daftar tugas, subtugas, dan 3 hal terpenting menyusul di tahap 3." />
    </div>
  )
}
