import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { addMonths, endOfMonth, startOfMonth } from 'date-fns'
import { Briefcase, CheckCircle2, ChevronLeft, ChevronRight, Plus, Receipt, Send } from 'lucide-react'
import { BackHeader } from '@/components/BackHeader'
import { Button, Card, EmptyState, IconButton } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { db } from '@/db/db'
import { useSettings } from '@/db/settings'
import type { Client, Invoice } from '@/db/types'
import { copyText } from '@/lib/clipboard'
import { durationLabel, fmt, fromKey, toKey, todayKey } from '@/lib/date'
import { invoiceText, rupiah, summarize } from '@/lib/freelance'
import { cn } from '@/lib/cn'
import { ClientSheet, InvoiceSheet } from './FreelanceSheets'

export function FreelancePage() {
  const today = todayKey()
  const s = useSettings()
  const toast = useToast()
  const [month, setMonth] = useState(toKey(startOfMonth(fromKey(today))))
  const from = month
  const to = toKey(endOfMonth(fromKey(month)))
  const data = useLiveQuery(async () => {
    const [clients, invoices, tasks, sessions] = await Promise.all([
      db.clients.toArray(),
      db.invoices.toArray(),
      db.tasks.filter((t) => !!t.clientId).toArray(),
      db.sessions.where('date').between(from, to, true, true).toArray(),
    ])
    return { clients, invoices, tasks, sessions }
  }, [from, to])
  const [cs, setCs] = useState<Client | 'new' | null>(null)
  const [is, setIs] = useState<Invoice | 'new' | null>(null)

  if (!data) return <BackHeader title="Freelance" />
  const active = data.clients.filter((c) => !c.archived)
  const sums = summarize(active, data.tasks, data.sessions, data.invoices, from, to)
  const minutes = sums.reduce((a, x) => a + x.minutes, 0)
  const billable = sums.reduce((a, x) => a + x.billable, 0)
  const unpaid = data.invoices.filter((i) => i.status === 'unpaid').reduce((a, i) => a + i.amount, 0)
  const received = sums.reduce((a, x) => a + x.paid, 0)
  const clientOf = new Map(data.clients.map((c) => [c.id, c]))
  const invoices = [...data.invoices].sort((a, b) => (a.status === b.status ? b.date.localeCompare(a.date) : a.status === 'unpaid' ? -1 : 1))

  const share = async (inv: Invoice) => {
    const c = clientOf.get(inv.clientId)
    if (!c) return
    const text = invoiceText(inv, c, s.name || undefined)
    if (navigator.share) {
      try {
        await navigator.share({ text })
        return
      } catch {
        /* dibatalkan → salin saja */
      }
    }
    toast((await copyText(text)) ? { text: 'Teks tagihan tersalin.', tone: 'success' } : { text: 'Gagal menyalin.', tone: 'error' })
  }

  const tiles = [
    { label: 'Jam kerja', value: durationLabel(minutes), sub: 'dari sesi fokus tugas klien' },
    { label: 'Nilai kerja (per jam)', value: billable ? rupiah(billable) : '–', sub: 'jam × tarif' },
    { label: 'Belum dibayar', value: unpaid ? rupiah(unpaid) : 'Rp0', sub: `${data.invoices.filter((i) => i.status === 'unpaid').length} invoice`, warn: unpaid > 0 },
    { label: 'Diterima', value: received ? rupiah(received) : 'Rp0', sub: 'bulan ini' },
  ]

  return (
    <div className="animate-rise space-y-4">
      <BackHeader title="Freelance" sub="Klien, jam tertagih, dan invoice" />

      <div className="flex items-center justify-between">
        <IconButton icon={ChevronLeft} label="Bulan sebelumnya" onClick={() => setMonth(toKey(addMonths(fromKey(month), -1)))} />
        <span className="font-medium capitalize">{fmt(month, 'MMMM yyyy')}</span>
        <IconButton icon={ChevronRight} label="Bulan berikutnya" disabled={to >= today} onClick={() => setMonth(toKey(addMonths(fromKey(month), 1)))} className="disabled:opacity-25" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {tiles.map((t) => (
          <Card key={t.label} className="p-3.5">
            <p className="text-xs text-muted">{t.label}</p>
            <p className={cn('truncate font-display text-xl font-semibold tabular-nums', t.warn && 'text-[#f59e0b]')}>{t.value}</p>
            <p className="truncate text-[11px] text-faint">{t.sub}</p>
          </Card>
        ))}
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">Klien</h2>
          <Button size="sm" variant="ghost" icon={Plus} onClick={() => setCs('new')}>
            Tambah
          </Button>
        </div>
        {active.length === 0 ? (
          <Card>
            <EmptyState
              icon={Briefcase}
              title="Belum ada klien"
              body="Tambah klien, lalu tautkan tugas ke klien itu. Sesi fokus di tugas tersebut otomatis jadi jam kerja tertagih."
              action={
                <Button variant="primary" icon={Plus} onClick={() => setCs('new')}>
                  Tambah klien
                </Button>
              }
            />
          </Card>
        ) : (
          <ul className="space-y-2">
            {sums.map(({ client: c, minutes: m, billable: b, unpaid: u }) => (
              <li key={c.id}>
                <button type="button" onClick={() => setCs(c)} className="glass flex w-full items-center gap-3 rounded-3xl p-3.5 text-left hover:bg-white/5">
                  <span className="size-3 shrink-0 rounded-full" style={{ background: c.color }} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{c.name}</span>
                    <span className="block text-xs text-muted">
                      {c.rate ? `${rupiah(c.rate)}${c.rateType === 'hour' ? '/jam' : '/proyek'}` : 'Tarif belum diisi'} · {durationLabel(m)} bulan ini
                    </span>
                  </span>
                  <span className="text-right text-xs">
                    {b > 0 && <span className="block font-semibold tabular-nums">{rupiah(b)}</span>}
                    {u > 0 && <span className="block tabular-nums text-[#f59e0b]">{rupiah(u)} tertunggak</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">Invoice</h2>
          <Button size="sm" variant="ghost" icon={Plus} onClick={() => setIs('new')} disabled={!active.length}>
            Buat
          </Button>
        </div>
        {invoices.length === 0 ? (
          <Card className="flex items-center gap-3 text-sm text-muted">
            <Receipt className="size-5 shrink-0 text-accent-2" aria-hidden />
            Catat tagihan supaya tahu mana yang belum dibayar. Teksnya bisa langsung dikirim lewat WhatsApp.
          </Card>
        ) : (
          <ul className="glass divide-y divide-line rounded-3xl">
            {invoices.map((inv) => {
              const c = clientOf.get(inv.clientId)
              const late = inv.status === 'unpaid' && inv.due && inv.due < today
              return (
                <li key={inv.id} className="flex items-center gap-1 py-1 pl-1 pr-1">
                  <IconButton
                    icon={CheckCircle2}
                    label={inv.status === 'paid' ? 'Tandai belum dibayar' : 'Tandai lunas'}
                    className={inv.status === 'paid' ? 'text-accent-3' : ''}
                    onClick={() => db.invoices.update(inv.id, inv.status === 'paid' ? { status: 'unpaid', paidAt: undefined } : { status: 'paid', paidAt: Date.now() })}
                  />
                  <button type="button" onClick={() => setIs(inv)} className="min-h-11 min-w-0 flex-1 py-1.5 text-left">
                    <span className={cn('block truncate font-medium', inv.status === 'paid' && 'text-muted')}>{inv.title}</span>
                    <span className="block text-xs text-muted">
                      {c?.name ?? 'Klien terhapus'} · {inv.status === 'paid' ? 'Lunas' : late ? <b className="text-danger">Lewat jatuh tempo</b> : inv.due ? `jatuh tempo ${fmt(inv.due, 'd MMM')}` : 'Belum dibayar'}
                    </span>
                  </button>
                  <span className="px-1 text-sm font-semibold tabular-nums">{rupiah(inv.amount)}</span>
                  {inv.status === 'unpaid' && <IconButton icon={Send} label="Kirim teks tagihan" onClick={() => share(inv)} />}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <p className="px-1 text-xs text-faint">Tips: di detail tugas, pilih klien supaya jam fokusnya terhitung di sini.</p>

      {cs && <ClientSheet key={cs === 'new' ? 'new' : cs.id} client={cs === 'new' ? undefined : cs} onClose={() => setCs(null)} />}
      {is && (
        <InvoiceSheet
          key={is === 'new' ? 'new' : is.id}
          invoice={is === 'new' ? undefined : is}
          clients={active}
          suggest={Object.fromEntries(sums.map((x) => [x.client.id, x.billable]))}
          onClose={() => setIs(null)}
        />
      )}
    </div>
  )
}
