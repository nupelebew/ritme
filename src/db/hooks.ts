import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db } from './db'
import type { Category } from './types'

/** Semua kategori (termasuk arsip) urut sesuai `order` */
export function useAllCategories(): Category[] {
  return useLiveQuery(() => db.categories.orderBy('order').toArray(), [], [])
}

/** Kategori aktif + peta id -> kategori (peta juga memuat yang diarsipkan, untuk data lama) */
export function useCategories() {
  const all = useAllCategories()
  return useMemo(() => {
    const map = new Map(all.map((c) => [c.id, c]))
    return { list: all.filter((c) => !c.archived), map, ready: all.length > 0 }
  }, [all])
}

export const FALLBACK_CATEGORY: Category = { id: '?', name: 'Lainnya', color: '#94a3b8', icon: 'sparkles', order: 99 }
