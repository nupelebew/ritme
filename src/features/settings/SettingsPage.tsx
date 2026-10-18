import { useEffect, useState, type ReactNode } from 'react'
import { periodicSyncSupported } from '@/features/reminders/useAgenda'
import { Link } from 'react-router'
import { BellRing, ChevronRight, Download, Minus, Monitor, Moon, Palette, Plus, Share, Smartphone, Sun } from 'lucide-react'
import { BackHeader } from '@/components/BackHeader'
import { Button, Card, Chip, Field, IconButton, Toggle } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { DEFAULT_ABOUT, setSetting, useSettings, type AccentId, type Settings } from '@/db/settings'
import { showLocalNotification } from '@/lib/notify'
import { isIOS, useInstall } from '@/lib/install'
import { cn } from '@/lib/cn'
import { useNotificationsActive } from '@/features/reminders/useReminders'
import { BackupCard } from './BackupCard'

const themes: { v: Settings['theme']; label: string; icon: typeof Sun }[] = [
  { v: 'dark', label: 'Gelap', icon: Moon },
  { v: 'light', label: 'Terang', icon: Sun },
  { v: 'system', label: 'Ikut sistem', icon: Monitor },
]

const ACCENTS: { id: AccentId; label: string; colors: [string, string] }[] = [
  { id: 'aurora', label: 'Aurora', colors: ['#8b7bff', '#22d3ee'] },
  { id: 'sunset', label: 'Senja', colors: ['#ff7a59', '#ffb547'] },
  { id: 'ocean', label: 'Samudra', colors: ['#5b8cff', '#22d3ee'] },
  { id: 'forest', label: 'Hutan', colors: ['#34d399', '#a3e635'] },
  { id: 'sakura', label: 'Sakura', colors: ['#f472b6', '#c084fc'] },
]

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-xs font-semibold uppercase tracking-[0.14em] text-faint">{title}</h2>
      {children}
    </section>
  )
}

function Stepper({ label, value, min, max, onChange, format }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; format: (v: number) => string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex-1 text-sm">{label}</span>
      <IconButton icon={Minus} label={`Kurangi ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)} className="disabled:opacity-30" />
      <span className="w-14 text-center font-display text-lg font-semibold tabular-nums">{format(value)}</span>
      <IconButton icon={Plus} label={`Tambah ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)} className="disabled:opacity-30" />
    </div>
  )
}

export function SettingsPage() {
  const s = useSettings()
  const toast = useToast()
  const notif = useNotificationsActive()
  const install = useInstall()
  const hh = (h: number) => `${String(h).padStart(2, '0')}:00`
  const [bgSync, setBgSync] = useState(false)
  useEffect(() => {
    void periodicSyncSupported().then(setBgSync)
  }, [])

  const enableNotifications = async () => {
    if (notif.status === 'unsupported') return
    let perm = Notification.permission
    if (perm === 'default') perm = await Notification.requestPermission()
    notif.refresh()
    if (perm === 'granted') {
      await setSetting('notifications', true)
      toast({ text: 'Notifikasi aktif.', tone: 'success' })
    } else toast({ text: 'Izin notifikasi ditolak. Ritme akan memakai banner pengingat.', tone: 'error' })
  }

  const notifHint =
    notif.status === 'unsupported'
      ? isIOS() && !install.installed
        ? 'Di iPhone/iPad, notifikasi hanya tersedia setelah Ritme dipasang ke layar utama (iOS 16.4+).'
        : 'Browser ini tidak mendukung notifikasi. Ritme akan menampilkan banner saat dibuka malam hari.'
      : notif.status === 'denied'
        ? 'Izin ditolak. Buka pengaturan situs di browser → Notifikasi → Izinkan, lalu kembali ke sini.'
        : 'Notifikasi dikirim selama Ritme terbuka atau masih berjalan di latar. Kalau aplikasi ditutup total, banner malam jadi pengingatnya.'

  return (
    <div className="animate-rise space-y-6">
      <BackHeader title="Pengaturan" />

      <Section title="Profil & tampilan">
        <Card className="space-y-4">
          <Field label="Nama panggilan" hint="Dipakai untuk sapaan dan di prompt AI.">
            <input className="field" defaultValue={s.name} key={s.name} placeholder="mis. Raka" onBlur={(e) => setSetting('name', e.target.value.trim())} />
          </Field>
          <div className="space-y-1.5">
            <span className="text-[13px] font-medium text-muted">Tema</span>
            <div role="radiogroup" aria-label="Tema" className="grid grid-cols-3 gap-2">
              {themes.map(({ v, label, icon: Icon }) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={s.theme === v}
                  onClick={() => setSetting('theme', v)}
                  className={cn(
                    'flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border text-sm transition',
                    s.theme === v ? 'border-accent bg-accent/15 text-ink' : 'border-line text-muted hover:text-ink',
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <Field
            label="Tentang saya"
            hint="Dipakai di prompt AI (rencana & rekap) supaya sarannya pas. Kosongkan untuk memakai deskripsi bawaan."
          >
            <textarea
              className="field min-h-24 resize-y text-sm"
              defaultValue={s.about}
              key={`about-${s.about.length}`}
              placeholder={DEFAULT_ABOUT}
              onBlur={(e) => setSetting('about', e.target.value.trim())}
            />
          </Field>
          <div className="space-y-1.5">
            <span className="text-[13px] font-medium text-muted">Warna aksen</span>
            <div role="radiogroup" aria-label="Warna aksen" className="flex flex-wrap gap-2">
              {ACCENTS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  role="radio"
                  aria-checked={s.accent === a.id}
                  onClick={() => setSetting('accent', a.id)}
                  className={cn(
                    'flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm transition',
                    s.accent === a.id ? 'border-ink/60 bg-white/10' : 'border-line text-muted hover:text-ink',
                  )}
                >
                  <span className="size-4 rounded-full" style={{ background: `linear-gradient(120deg, ${a.colors[0]}, ${a.colors[1]})` }} aria-hidden />
                  {a.label}
                </button>
              ))}
            </div>
          </div>
          <Link to="/kategori" className="flex min-h-11 items-center gap-3 rounded-2xl text-sm hover:text-ink">
            <Palette className="size-5 text-muted" aria-hidden />
            <span className="flex-1">Atur kategori</span>
            <ChevronRight className="size-5 text-faint" aria-hidden />
          </Link>
        </Card>
      </Section>

      <Section title="Jam aktif">
        <Card className="space-y-1">
          <Stepper label="Mulai hari" value={s.dayStartHour} min={0} max={Math.min(12, s.dayEndHour - 6)} format={hh} onChange={(v) => setSetting('dayStartHour', v)} />
          <Stepper label="Akhir hari" value={s.dayEndHour} min={Math.max(14, s.dayStartHour + 6)} max={24} format={hh} onChange={(v) => setSetting('dayEndHour', v)} />
          <p className="pt-1 text-xs text-faint">Rentang timeline dan acuan penyusunan jadwal. Durasi timer fokus diatur di halaman Fokus.</p>
        </Card>
      </Section>

      <Section title="Pengingat">
        <Card className="space-y-4">
          <div className="flex items-center gap-3">
            <BellRing className={cn('size-6 shrink-0', notif.active ? 'text-accent-3' : 'text-muted')} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-medium">Notifikasi {notif.active ? 'aktif' : 'mati'}</p>
              <p className="text-xs text-muted">{notifHint}</p>
            </div>
          </div>
          {notif.status !== 'unsupported' && (
            <div className="flex gap-2">
              {notif.active ? (
                <>
                  <Button size="sm" onClick={() => showLocalNotification('Tes notifikasi Ritme', 'Kalau ini muncul, pengingat siap jalan. ✨', 'ritme-test')}>
                    Coba notifikasi
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSetting('notifications', false)}>
                    Matikan
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="primary" icon={BellRing} onClick={enableNotifications} disabled={notif.status === 'denied'}>
                  Aktifkan notifikasi
                </Button>
              )}
            </div>
          )}
          <div className="space-y-1.5">
            <span className="text-[13px] font-medium text-muted">Ingatkan sebelum kegiatan</span>
            <div className="flex flex-wrap gap-2">
              {[0, 5, 10, 15, 30].map((m) => (
                <Chip key={m} active={s.eventReminderMin === m} onClick={() => setSetting('eventReminderMin', m)}>
                  {m === 0 ? 'Mati' : `${m} mnt`}
                </Chip>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <span className="text-[13px] font-medium text-muted">Pengingat rencana besok mulai jam</span>
            <div className="flex flex-wrap gap-2">
              {[19, 20, 21, 22].map((h) => (
                <Chip key={h} active={s.eveningReminderHour === h} onClick={() => setSetting('eveningReminderHour', h)}>
                  {hh(h)}
                </Chip>
              ))}
            </div>
          </div>
          <div className="divide-y divide-line border-t border-line pt-1">
            <Toggle
              label="Agenda hari ini di notifikasi"
              hint={
                notif.active
                  ? `Satu notifikasi yang menetap & selalu terbarui, dengan tombol Selesai dan Mulai fokus.${bgSync ? ' Di HP ini juga muncul ringkasan pagi otomatis (jamnya diatur Android).' : ''}`
                  : 'Butuh notifikasi aktif.'
              }
              checked={notif.active && s.agendaNotif}
              disabled={!notif.active}
              onChange={(v) => setSetting('agendaNotif', v)}
            />
            <Toggle
              label="Angka di ikon aplikasi"
              hint="Jumlah tugas yang tenggatnya hari ini atau sudah lewat (iPhone, Windows, Mac; Android biasanya titik)."
              checked={s.badge}
              onChange={(v) => setSetting('badge', v)}
            />
            <Toggle
              label="Layar tetap menyala saat fokus"
              hint="Selama timer berjalan dan Ritme terbuka."
              checked={s.keepAwake}
              onChange={(v) => setSetting('keepAwake', v)}
            />
          </div>
        </Card>
      </Section>

      <Section title="Pasang di layar utama">
        <Card className="space-y-3">
          {install.installed ? (
            <p className="flex items-center gap-2 text-sm">
              <Smartphone className="size-5 text-accent-3" aria-hidden /> Ritme sudah terpasang sebagai aplikasi. 🎉
            </p>
          ) : install.canPrompt ? (
            <>
              <p className="text-sm text-muted">Pasang supaya Ritme terbuka layar penuh, cepat, dan jalan offline seperti aplikasi biasa.</p>
              <Button
                variant="primary"
                icon={Download}
                onClick={async () => (await install.prompt()) && toast({ text: 'Ritme terpasang!', tone: 'success' })}
              >
                Pasang Ritme
              </Button>
            </>
          ) : install.ios ? (
            <ol className="list-inside list-decimal space-y-1 text-sm text-muted">
              <li>
                Buka Ritme di <b className="text-ink">Safari</b>.
              </li>
              <li>
                Ketuk tombol <Share className="inline size-4" aria-label="Bagikan" /> <b className="text-ink">Bagikan</b>.
              </li>
              <li>
                Pilih <b className="text-ink">Tambah ke Layar Utama</b>, lalu <b className="text-ink">Tambah</b>.
              </li>
            </ol>
          ) : (
            <p className="text-sm text-muted">
              Buka menu browser (⋮) lalu pilih <b className="text-ink">Instal aplikasi</b> / <b className="text-ink">Tambahkan ke layar utama</b>.
            </p>
          )}
        </Card>
      </Section>

      <Section title="Data">
        <BackupCard />
      </Section>

      <p className="pb-2 text-center text-xs text-faint">
        Ritme v{__APP_VERSION__} · 100% di perangkat, tanpa akun, tanpa server, tanpa kunci API.
      </p>
    </div>
  )
}
