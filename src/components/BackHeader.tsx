import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router'
import type { ReactNode } from 'react'
import { IconButton } from './ui'

/** Header untuk halaman turunan dari "Lainnya" */
export function BackHeader({ title, sub, action }: { title: string; sub?: ReactNode; action?: ReactNode }) {
  const nav = useNavigate()
  return (
    <header className="flex items-center gap-2 pb-4 pt-2">
      <IconButton
        icon={ChevronLeft}
        label="Kembali"
        className="-ml-2"
        onClick={() => (history.length > 1 ? nav(-1) : nav('/lainnya'))}
      />
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-2xl font-semibold tracking-tight">{title}</h1>
        {sub && <p className="text-[13px] text-muted">{sub}</p>}
      </div>
      {action}
    </header>
  )
}
