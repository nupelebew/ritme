import type { Client, DateKey, FocusSession, Invoice, Task } from '@/db/types'

export const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Math.round(n))

/** "1.500.000" / "1,5jt" / "150rb" / "1500000" → angka */
export function parseRupiah(s: string): number | undefined {
  const t = s.trim().toLowerCase().replace(/^rp\.?\s*/, '').replace(/\s/g, '')
  if (!t) return undefined
  const m = /^([\d.,]+)(jt|juta|rb|ribu|k)?$/.exec(t)
  if (!m) return undefined
  let num: number
  if (m[2]) num = Number(m[1].replace(/\./g, '').replace(',', '.'))
  else num = Number(m[1].replace(/[.,]/g, ''))
  if (Number.isNaN(num)) return undefined
  if (m[2] === 'jt' || m[2] === 'juta') num *= 1_000_000
  else if (m[2]) num *= 1_000
  return Math.round(num)
}

export interface ClientSummary {
  client: Client
  /** Menit kerja tercatat (sesi fokus pada tugas klien) dalam rentang */
  minutes: number
  /** Estimasi nilai kerja = jam × tarif (hanya untuk tarif per jam) */
  billable: number
  unpaid: number
  paid: number
}

/** Ringkasan per klien untuk rentang tanggal [from, to] */
export function summarize(
  clients: Client[],
  tasks: Task[],
  sessions: FocusSession[],
  invoices: Invoice[],
  from: DateKey,
  to: DateKey,
): ClientSummary[] {
  const taskClient = new Map(tasks.filter((t) => t.clientId).map((t) => [t.id, t.clientId!]))
  return clients.map((client) => {
    const minutes = sessions
      .filter((s) => s.date >= from && s.date <= to && s.taskId && taskClient.get(s.taskId) === client.id)
      .reduce((a, s) => a + s.durationMin, 0)
    const inv = invoices.filter((i) => i.clientId === client.id)
    return {
      client,
      minutes,
      billable: client.rateType === 'hour' && client.rate ? (minutes / 60) * client.rate : 0,
      unpaid: inv.filter((i) => i.status === 'unpaid').reduce((a, i) => a + i.amount, 0),
      paid: inv.filter((i) => i.status === 'paid' && i.date >= from && i.date <= to).reduce((a, i) => a + i.amount, 0),
    }
  })
}

/** Teks invoice sederhana untuk dikirim lewat WA/email */
export function invoiceText(i: { title: string; amount: number; date: DateKey; due?: DateKey }, client: Client, from?: string) {
  return [
    `Halo ${client.name},`,
    '',
    `Berikut tagihan untuk: ${i.title}`,
    `Jumlah: ${rupiah(i.amount)}`,
    `Tanggal: ${i.date}${i.due ? ` · Jatuh tempo: ${i.due}` : ''}`,
    '',
    'Terima kasih! 🙏',
    from ? `— ${from}` : '',
  ]
    .filter((l, k, a) => l !== '' || a[k - 1] !== '')
    .join('\n')
    .trim()
}
