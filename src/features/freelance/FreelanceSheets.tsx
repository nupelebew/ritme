import { useState } from 'react'
import { Archive, Check, Trash2 } from 'lucide-react'
import { Button, Chip, Field, Sheet } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { db, uid } from '@/db/db'
import type { Client, Invoice } from '@/db/types'
import { shiftKey, todayKey } from '@/lib/date'
import { parseRupiah, rupiah } from '@/lib/freelance'
import { PALETTE } from '@/lib/icons'

export function ClientSheet({ client, onClose }: { client?: Client; onClose: () => void }) {
  const toast = useToast()
  const [name, setName] = useState(client?.name ?? '')
  const [rate, setRate] = useState(client?.rate ? String(client.rate) : '')
  const [rateType, setRateType] = useState<Client['rateType']>(client?.rateType ?? 'hour')
  const [color, setColor] = useState(client?.color ?? PALETTE[1])
  const parsed = parseRupiah(rate)

  const save = async () => {
    if (!name.trim()) return
    const data = { name: name.trim(), rate: parsed, rateType, color }
    if (client) await db.clients.update(client.id, data)
    else await db.clients.add({ ...data, id: uid(), createdAt: Date.now() })
    onClose()
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={client ? 'Ubah klien' : 'Klien baru'}
      footer={
        <>
          {client && (
            <Button
              variant="danger"
              icon={Archive}
              onClick={async () => {
                await db.clients.update(client.id, { archived: true })
                toast({ text: `${client.name} diarsipkan.`, action: { label: 'Urungkan', run: () => void db.clients.update(client.id, { archived: false }) } })
                onClose()
              }}
            >
              Arsipkan
            </Button>
          )}
          <Button variant="primary" icon={Check} className="flex-1" disabled={!name.trim() || (!!rate && parsed === undefined)} onClick={save}>
            Simpan klien
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nama klien">
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Kopi Senja" />
        </Field>
        <div className="space-y-1.5">
          <span className="text-[13px] font-medium text-muted">Jenis tarif</span>
          <div className="flex gap-2">
            <Chip active={rateType === 'hour'} onClick={() => setRateType('hour')}>
              Per jam
            </Chip>
            <Chip active={rateType === 'project'} onClick={() => setRateType('project')}>
              Per proyek
            </Chip>
          </div>
        </div>
        <Field label={rateType === 'hour' ? 'Tarif per jam (opsional)' : 'Nilai proyek (opsional)'} hint={parsed ? rupiah(parsed) : 'Boleh ditulis 150rb, 1,5jt, atau 1.500.000'}>
          <input className="field" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="mis. 100rb" />
        </Field>
        <div className="space-y-1.5">
          <span className="text-[13px] font-medium text-muted">Warna</span>
          <div className="flex flex-wrap gap-2">
            {PALETTE.slice(0, 10).map((p) => (
              <button key={p} type="button" aria-label={`Warna ${p}`} aria-pressed={color === p} onClick={() => setColor(p)} className="grid size-11 place-items-center rounded-2xl" style={{ background: p }}>
                {color === p && <Check className="size-5 text-white" aria-hidden />}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Sheet>
  )
}

export function InvoiceSheet({ invoice, clients, suggest, onClose }: { invoice?: Invoice; clients: Client[]; suggest?: Record<string, number>; onClose: () => void }) {
  const toast = useToast()
  const today = todayKey()
  const [clientId, setClientId] = useState(invoice?.clientId ?? clients[0]?.id ?? '')
  const [title, setTitle] = useState(invoice?.title ?? '')
  const [amount, setAmount] = useState(invoice ? String(invoice.amount) : '')
  const [date, setDate] = useState(invoice?.date ?? today)
  const [due, setDue] = useState(invoice?.due ?? shiftKey(today, 7))
  const parsed = parseRupiah(amount)
  const hint = !invoice && suggest?.[clientId] ? Math.round(suggest[clientId] / 1000) * 1000 : 0

  const save = async () => {
    if (!clientId || !title.trim() || !parsed) return
    const data = { clientId, title: title.trim(), amount: parsed, date, due: due || undefined }
    if (invoice) await db.invoices.update(invoice.id, data)
    else await db.invoices.add({ ...data, id: uid(), status: 'unpaid' })
    onClose()
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={invoice ? 'Ubah invoice' : 'Invoice baru'}
      footer={
        <>
          {invoice && (
            <Button
              variant="danger"
              icon={Trash2}
              onClick={async () => {
                await db.invoices.delete(invoice.id)
                toast({ text: 'Invoice dihapus.', action: { label: 'Urungkan', run: () => void db.invoices.put(invoice) } })
                onClose()
              }}
            >
              Hapus
            </Button>
          )}
          <Button variant="primary" icon={Check} className="flex-1" disabled={!clientId || !title.trim() || !parsed} onClick={save}>
            Simpan invoice
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <span className="text-[13px] font-medium text-muted">Klien</span>
          <div className="flex flex-wrap gap-2">
            {clients.map((c) => (
              <Chip key={c.id} color={c.color} active={clientId === c.id} onClick={() => setClientId(c.id)}>
                {c.name}
              </Chip>
            ))}
          </div>
        </div>
        <Field label="Untuk pekerjaan">
          <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="mis. Desain logo + 2x revisi" />
        </Field>
        <Field label="Jumlah" hint={parsed ? rupiah(parsed) : hint ? `Saran dari jam kerja bulan ini: ${rupiah(hint)}` : 'mis. 750rb atau 1,2jt'}>
          <div className="flex gap-2">
            <input className="field" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            {hint > 0 && !amount && (
              <Button size="sm" onClick={() => setAmount(String(hint))}>
                Pakai saran
              </Button>
            )}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Tanggal">
            <input type="date" className="field" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          </Field>
          <Field label="Jatuh tempo">
            <input type="date" className="field" value={due} onChange={(e) => setDue(e.target.value)} />
          </Field>
        </div>
      </div>
    </Sheet>
  )
}
