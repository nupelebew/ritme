import { useRef, useState } from 'react'
import { Download, FileJson, FileSpreadsheet, Upload } from 'lucide-react'
import { Button, Card, Sheet } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { db } from '@/db/db'
import {
  CSV_LABEL,
  TABLE_LABEL,
  countBackup,
  download,
  exportBackup,
  exportCSV,
  importBackup,
  importCSV,
  parseBackup,
  type Backup,
  type CsvKind,
} from '@/db/backup'
import { todayKey } from '@/lib/date'

export function BackupCard() {
  const toast = useToast()
  const file = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Backup | null>(null)

  const exportJson = async () => {
    const b = await exportBackup(db)
    download(`ritme-cadangan-${todayKey()}.json`, JSON.stringify(b, null, 2), 'application/json')
    toast({ text: 'Cadangan JSON diunduh. Simpan di Drive/WA pribadi supaya aman.', tone: 'success' })
  }
  const exportCsv = async (k: CsvKind) => {
    download(`ritme-${k}-${todayKey()}.csv`, await exportCSV(db, k), 'text/csv;charset=utf-8')
  }

  const onFile = async (f: File) => {
    const text = await f.text()
    if (/\.csv$/i.test(f.name) || f.type.includes('csv')) {
      try {
        const r = await importCSV(db, text)
        toast({ text: `${r.count} baris ${CSV_LABEL[r.kind].toLowerCase()} diimpor.`, tone: 'success', action: { label: 'Urungkan', run: r.undo } })
      } catch (e) {
        toast({ text: (e as Error).message, tone: 'error' })
      }
      return
    }
    const { backup, error } = parseBackup(text)
    if (error) return toast({ text: error, tone: 'error' })
    setPending(backup!)
  }

  const doImport = async (mode: 'merge' | 'replace') => {
    if (!pending) return
    const undo = await importBackup(db, pending, mode)
    setPending(null)
    toast({ text: mode === 'replace' ? 'Data diganti dari cadangan.' : 'Cadangan digabungkan.', tone: 'success', action: { label: 'Urungkan', run: undo } })
  }

  return (
    <Card className="space-y-3" id="data">
      <div>
        <h2 className="font-display font-semibold">Ekspor & impor</h2>
        <p className="text-[13px] text-muted">Semua data hanya ada di perangkat ini. Cadangkan rutin, atau pindahkan ke HP/laptop lain.</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="primary" icon={FileJson} onClick={exportJson}>
          Ekspor JSON
        </Button>
        <Button icon={Upload} onClick={() => file.current?.click()}>
          Impor file
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(CSV_LABEL) as CsvKind[]).map((k) => (
          <Button key={k} size="sm" variant="ghost" icon={FileSpreadsheet} onClick={() => exportCsv(k)}>
            CSV {CSV_LABEL[k].toLowerCase()}
          </Button>
        ))}
      </div>
      <p className="text-xs text-faint">JSON = cadangan lengkap. CSV untuk dibuka di Excel/Sheets, dan bisa diimpor balik (digabung).</p>
      <input
        ref={file}
        type="file"
        accept=".json,.csv,application/json,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void onFile(f)
          e.target.value = ''
        }}
      />

      {pending && (
        <Sheet
          open
          onClose={() => setPending(null)}
          title="Impor cadangan"
          footer={
            <>
              <Button variant="danger" onClick={() => doImport('replace')}>
                Ganti semua data
              </Button>
              <Button variant="primary" icon={Download} className="flex-1" onClick={() => doImport('merge')}>
                Gabungkan
              </Button>
            </>
          }
        >
          <p className="text-sm text-muted">
            Cadangan dari {pending.exportedAt ? new Date(pending.exportedAt).toLocaleString('id-ID') : 'tanggal tidak diketahui'} berisi:
          </p>
          <ul className="mt-2 grid grid-cols-2 gap-1 text-sm">
            {Object.entries(countBackup(pending)).map(([t, n]) => (
              <li key={t} className="flex justify-between rounded-lg bg-white/5 px-2 py-1">
                <span className="text-muted">{TABLE_LABEL[t as keyof typeof TABLE_LABEL]}</span>
                <span className="tabular-nums">{n}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[13px] text-muted">
            <b className="text-ink">Gabungkan</b>: data dengan ID sama diperbarui, sisanya tetap. <b className="text-ink">Ganti semua</b>: data di perangkat ini dihapus dulu. Keduanya bisa diurungkan sesaat setelahnya.
          </p>
        </Sheet>
      )}
    </Card>
  )
}
