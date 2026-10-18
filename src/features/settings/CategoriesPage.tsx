import { Palette } from 'lucide-react'
import { BackHeader } from '@/components/BackHeader'
import { EmptyState } from '@/components/ui'

export function CategoriesPage() {
  return (
    <div className="animate-rise">
      <BackHeader title="Kategori" />
      <EmptyState icon={Palette} title="Segera hadir" body="Pengelolaan kategori menyusul di tahap 2." />
    </div>
  )
}
