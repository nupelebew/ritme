/** CSV sederhana sesuai RFC 4180 (koma, kutip ganda, baris baru di dalam kutip) */

const needsQuote = /[",\n\r]/

export function toCSV<T extends object>(rows: T[], columns: (keyof T & string)[]): string {
  const cell = (v: unknown) => {
    if (v === undefined || v === null) return ''
    const s = Array.isArray(v) || typeof v === 'object' ? JSON.stringify(v) : String(v)
    return needsQuote.test(s) || /^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [columns.join(','), ...rows.map((r) => columns.map((c) => cell(r[c])).join(','))].join('\r\n')
}

export function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let row: string[] = []
  let cur = ''
  let q = false
  const src = text.replace(/^﻿/, '')
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (q) {
      if (ch === '"' && src[i + 1] === '"') {
        cur += '"'
        i++
      } else if (ch === '"') q = false
      else cur += ch
    } else if (ch === '"') q = true
    else if (ch === ',') {
      row.push(cur)
      cur = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(cur)
      rows.push(row)
      row = []
      cur = ''
    } else cur += ch
  }
  if (cur || row.length) {
    row.push(cur)
    rows.push(row)
  }
  const [header, ...body] = rows.filter((r) => r.some((c) => c !== ''))
  if (!header) return []
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), r[i] ?? ''])))
}
