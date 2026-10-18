import { nextDay, type Day } from 'date-fns'
import type { Category, DateKey, Priority } from '@/db/types'
import { fromKey, shiftKey, toKey } from './date'

export interface ParsedTask {
  title: string
  due?: DateKey
  priority?: Priority
  categoryId?: string
  estimateMin?: number
}

const DAYS: Record<string, Day> = { minggu: 0, senin: 1, selasa: 2, rabu: 3, kamis: 4, jumat: 5, "jum'at": 5, sabtu: 6 }

/**
 * Tambah cepat gaya bahasa sehari-hari:
 *   "Kirim draft ke dosbing besok !3 #skripsi 30m"
 * - tanggal: hari ini, besok, lusa, nama hari (senin…minggu), atau 25/10
 * - prioritas: !1 … !4
 * - kategori: #nama (cocokkan awal nama, tanpa spasi)
 * - estimasi: 30m, 1j, 1.5j
 */
export function parseQuickAdd(input: string, today: DateKey, categories: Category[]): ParsedTask {
  let text = ` ${input} `
  const out: ParsedTask = { title: '' }
  const take = (re: RegExp, fn: (m: RegExpMatchArray) => boolean | void) => {
    const m = text.match(re)
    if (m && fn(m) !== false) text = text.replace(m[0], ' ')
  }

  take(/\s!([1-4])(?=\s)/, (m) => {
    out.priority = Number(m[1]) as Priority
  })
  // versi ucapan: "prioritas tinggi", "penting banget"
  if (!out.priority)
    take(/\s(?:prioritas\s+(rendah|sedang|tinggi|mendesak)|(penting banget|urgent|mendesak))(?=\s)/i, (m) => {
      const w = (m[1] ?? m[2]).toLowerCase()
      out.priority = (w === 'rendah' ? 1 : w === 'sedang' ? 2 : w === 'tinggi' ? 3 : 4) as Priority
    })
  const findCat = (q: string) => categories.find((x) => x.name.toLowerCase().replace(/\s+/g, '').startsWith(q.toLowerCase().replace(/\s+/g, '')))
  take(/\s#([\p{L}\d_-]+)(?=\s)/u, (m) => {
    const c = findCat(m[1])
    if (!c) return false
    out.categoryId = c.id
  })
  // versi ucapan: "kategori skripsi", "kategori bareng pasangan"
  if (!out.categoryId)
    take(/\skategori\s+([\p{L}\d]+(?:\s+[\p{L}\d]+)?)(?=\s)/iu, (m) => {
      const words = m[1].split(/\s+/)
      const c = findCat(m[1]) ?? findCat(words[0])
      if (!c) return false
      out.categoryId = c.id
      // kalau hanya kata pertama yang cocok, kembalikan kata kedua ke judul
      if (!findCat(m[1]) && words[1]) text = text.replace(m[0], ` ${words[1]}`)
    })
  take(/\s(\d+(?:[.,]\d+)?)\s?(m|mnt|menit|j|jam)(?=\s)/i, (m) => {
    const n = Number(m[1].replace(',', '.'))
    out.estimateMin = Math.round(/^j/i.test(m[2]) ? n * 60 : n)
  })
  take(/\s(hari ini|besok|lusa)(?=\s)/i, (m) => {
    const w = m[1].toLowerCase()
    out.due = w === 'hari ini' ? today : shiftKey(today, w === 'besok' ? 1 : 2)
  })
  if (!out.due)
    take(/\s(?:hari\s)?(minggu|senin|selasa|rabu|kamis|jumat|jum'at|sabtu)(?=\s)/i, (m) => {
      out.due = toKey(nextDay(fromKey(today), DAYS[m[1].toLowerCase()]))
    })
  if (!out.due)
    take(/\s(\d{1,2})\/(\d{1,2})(?=\s)/, (m) => {
      const [y] = today.split('-').map(Number)
      const d = Number(m[1])
      const mo = Number(m[2])
      if (d < 1 || d > 31 || mo < 1 || mo > 12) return false
      let key = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      if (key < today) key = `${y + 1}${key.slice(4)}`
      out.due = key
    })

  out.title = text.replace(/\s+/g, ' ').trim()
  return out
}
