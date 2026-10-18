import { describe, expect, it } from 'vitest'
import type { Client, FocusSession, Invoice, Task } from '@/db/types'
import { invoiceText, parseRupiah, rupiah, summarize } from './freelance'

describe('freelance', () => {
  it('membaca & menulis rupiah', () => {
    expect(parseRupiah('1.500.000')).toBe(1_500_000)
    expect(parseRupiah('Rp 250.000')).toBe(250_000)
    expect(parseRupiah('1,5jt')).toBe(1_500_000)
    expect(parseRupiah('150rb')).toBe(150_000)
    expect(parseRupiah('75k')).toBe(75_000)
    expect(parseRupiah('abc')).toBeUndefined()
    expect(rupiah(1_500_000).replace(/\s/g, ' ')).toMatch(/^Rp\s?1\.500\.000$/)
  })

  it('jam tertagih, nilai kerja, dan status invoice per klien', () => {
    const clients: Client[] = [
      { id: 'a', name: 'Kopi Senja', rate: 100_000, rateType: 'hour', color: '#0891b2', createdAt: 0 },
      { id: 'b', name: 'Toko Batik', rate: 2_000_000, rateType: 'project', color: '#d97706', createdAt: 0 },
    ]
    const tasks = [{ id: 't1', clientId: 'a' }, { id: 't2', clientId: 'b' }, { id: 't3' }] as Task[]
    const s = (taskId: string, date: string, durationMin: number) => ({ taskId, date, durationMin }) as FocusSession
    const invoices: Invoice[] = [
      { id: 'i1', clientId: 'a', title: 'Logo', amount: 500_000, status: 'unpaid', date: '2026-10-05' },
      { id: 'i2', clientId: 'b', title: 'Web', amount: 2_000_000, status: 'paid', date: '2026-10-10', paidAt: 1 },
      { id: 'i3', clientId: 'b', title: 'Web lama', amount: 1_000_000, status: 'paid', date: '2026-09-10', paidAt: 1 },
    ]
    const r = summarize(clients, tasks, [s('t1', '2026-10-02', 90), s('t1', '2026-09-30', 60), s('t2', '2026-10-03', 120), s('t3', '2026-10-03', 50)], invoices, '2026-10-01', '2026-10-31')
    expect(r[0]).toMatchObject({ minutes: 90, billable: 150_000, unpaid: 500_000, paid: 0 })
    expect(r[1]).toMatchObject({ minutes: 120, billable: 0, unpaid: 0, paid: 2_000_000 })
  })

  it('teks invoice siap kirim', () => {
    const t = invoiceText({ title: 'Desain logo', amount: 750_000, date: '2026-10-18', due: '2026-10-25' }, { id: 'a', name: 'Kopi Senja', rateType: 'project', color: '', createdAt: 0 }, 'Raka')
    expect(t).toContain('Halo Kopi Senja,')
    expect(t).toMatch(/Jumlah: Rp\s?750\.000/)
    expect(t).toContain('Jatuh tempo: 2026-10-25')
    expect(t.endsWith('— Raka')).toBe(true)
  })
})
