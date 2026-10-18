/** Ambil teks yang dibagikan ke Ritme lewat Web Share Target (?title=&text=&url=) */
export function readShared(search: string): string | null {
  const p = new URLSearchParams(search)
  const title = p.get('title')?.trim() ?? ''
  const text = p.get('text')?.trim() ?? ''
  const url = p.get('url')?.trim() ?? ''
  // Judul (nama halaman/percakapan) hanya dipakai kalau tidak ada teks
  let body = text || title
  if (url && !body.includes(url)) body = body ? `${body} ${url}` : url
  return body ? body.slice(0, 4000) : null
}

/** Pecah teks bagikan menjadi baris-baris kandidat tugas (buang bullet & baris kosong) */
export const sharedLines = (text: string) =>
  text
    .split(/\n+/)
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter((l) => l.length > 1)
    .slice(0, 20)
