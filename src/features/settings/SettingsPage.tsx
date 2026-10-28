import { useEffect, useState, type ReactNode } from 'react'
import { periodicSyncSupported } from '@/features/reminders/useAgenda'
import { Link } from 'react-router'
import { AlarmClock, BellRing, CalendarPlus, ChevronRight, Download, Minus, Monitor, Moon, Palette, Plus, Share, Smartphone, Sun } from 'lucide-react'
import { BackHeader } from '@/components/BackHeader'
import { Button, Card, Chip, Field, IconButton, Toggle } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { DEFAULT_ABOUT, setSetting, useSettings, type AccentId, type Settings } from '@/db/settings'
import { showLocalNotification } from '@/lib/notify'
import { isIOS, useInstall } from '@/lib/install'
import { cn } from '@/lib/cn'
import { setNativePermission, useNotificationsActive } from '@/features/reminders/useReminders'
import { exactAlarmAllowed, isNative, openExactAlarmSetting, requestNativePermission } from '@/lib/nativeNotify'
import { BackupCard } from './BackupCard'
import { exportCalendar } from '@/db/calendar'
import { createLock, lockFlag, lockSupported, markUnlocked, verifyLock } from '@/lib/appLock'
import { useCategories } from '@/db/hooks'

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
  const { list: categories } = useCategories()
  const toast = useToast()
  const notif = useNotificationsActive()
  const install = useInstall()
  const hh = (h: number) => `${String(h).padStart(2, '0')}:00`
  const [bgSync, setBgSync] = useState(false)
  const [lockOk, setLockOk] = useState(false)
  useEffect(() => {
    void lockSupported().then(setLockOk)
  }, [])
  useEffect(() => {
    void periodicSyncSupported().then(setBgSync)
  }, [])
  // Android 12+: tanpa izin "Alarm & pengingat", notifikasi bisa telat beberapa menit
  const [exactOk, setExactOk] = useState(true)
  useEffect(() => {
    if (!isNative()) return
    const check = () => void exactAlarmAllowed().then(setExactOk)
    check()
    document.addEventListener('visibilitychange', check)
    return () => document.removeEventListener('visibilitychange', check)
  }, [])

  const enableNotifications = async () => {
    if (notif.status === 'unsupported') return
    let perm: string
    if (isNative()) {
      perm = await requestNativePermission()
      setNativePermission(perm as 'granted')
    } else {
      perm = Notification.permission
      if (perm === 'default') perm = await Notification.requestPermission()
    }
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
        ? isNative()
          ? 'Izin ditolak. Buka Pengaturan HP → Aplikasi → Ritme → Notifikasi → Izinkan, lalu kembali ke sini.'
          : 'Izin ditolak. Buka pengaturan situs di browser → Notifikasi → Izinkan, lalu kembali ke sini.'
        : isNative()
          ? 'Pengingat dipasang sebagai alarm di HP, jadi tetap muncul walau Ritme ditutup. Buka Ritme minimal sekali tiap 3 hari supaya jadwalnya diperbarui.'
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

      <Section title="Target mingguan & jam tidur">
        <Card className="space-y-1">
          <p className="pb-1 text-xs text-muted">
            Jam per minggu yang ingin kamu sisihkan per kategori. Terhitung dari sesi fokus atau jadwal yang sudah lewat. Penyusun jadwal mendahulukan kategori yang tertinggal.
          </p>
          {categories.map((c) => {
            const h = Math.round((s.weeklyTargets[c.id] ?? 0) / 60)
            return (
              <Stepper
                key={c.id}
                label={c.name}
                value={h}
                min={0}
                max={40}
                format={(v) => (v ? `${v} j` : '–')}
                onChange={(v) => setSetting('weeklyTargets', { ...s.weeklyTargets, [c.id]: v * 60 })}
              />
            )
          })}
          <div className="space-y-1.5 border-t border-line pt-3">
            <span className="text-[13px] font-medium text-muted">Jam tidur</span>
            <div className="flex flex-wrap gap-2">
              {[0, 21, 22, 23, 24].map((v) => (
                <Chip key={v} active={s.bedtimeHour === v} onClick={() => setSetting('bedtimeHour', v)}>
                  {v ? hh(v) : 'Tidak dipakai'}
                </Chip>
              ))}
            </div>
            <p className="text-xs text-faint">Ritme memperingatkan jadwal yang melewati jam ini, dan penyusun otomatis berhenti 30 menit sebelumnya.</p>
          </div>
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
                <Button size="sm" variant="primary" icon={BellRing} onClick={enableNotifications} disabled={notif.status === 'denied' && !isNative()}>
                  Aktifkan notifikasi
                </Button>
              )}
            </div>
          )}
          {isNative() && notif.active && !exactOk && (
            <div className="space-y-2 rounded-2xl border border-accent/40 bg-accent/10 p-3 text-[13px] text-muted">
              <p>
                Supaya bunyi <b className="text-ink">tepat waktu</b>, izinkan Ritme memakai “Alarm &amp; pengingat”. Tanpa izin ini notifikasi tetap muncul, tapi bisa telat beberapa menit.
              </p>
              <Button size="sm" variant="primary" icon={AlarmClock} onClick={openExactAlarmSetting}>
                Buka pengaturan alarm
              </Button>
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
          <Toggle
            label="Bunyi saat kegiatan mulai"
            hint="Tiap pergantian blok (mis. 07.00 Sarapan): getar + notifikasi yang tetap tampil sampai diketuk. Saat Ritme terbuka juga bunyi “ting” dan pesan di layar."
            checked={s.blockAlerts}
            onChange={(v) => setSetting('blockAlerts', v)}
          />
          {!isNative() && (
          <details className="group rounded-2xl border border-accent/40 bg-accent/10 p-3">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold">
              <AlarmClock className="size-5 shrink-0 text-accent" aria-hidden />
              <span className="flex-1">Tetap bunyi walau Ritme ditutup</span>
              <ChevronRight className="size-4 text-faint transition group-open:rotate-90" aria-hidden />
            </summary>
            <div className="space-y-3 pt-2 text-[13px] text-muted">
              <p>
                Aplikasi web tidak bisa membangunkan dirinya sendiri setelah ditutup total. Solusinya: kirim jadwal ke <b className="text-ink">aplikasi Kalender HP</b> — kalender selalu berbunyi. File
                kalender dari Ritme sudah berisi alarm{s.blockAlerts ? ' saat mulai' : ''}
                {s.eventReminderMin ? ` dan ${s.eventReminderMin} menit sebelumnya` : ''}.
              </p>
              <Button
                variant="primary"
                icon={CalendarPlus}
                className="w-full"
                onClick={async () => {
                  const r = await exportCalendar()
                  if (r === 'downloaded') toast({ text: 'File kalender diunduh.', tone: 'success' })
                }}
              >
                Kirim jadwal ke kalender HP
              </Button>
              <ol className="list-inside list-decimal space-y-1.5">
                <li>
                  <b className="text-ink">iPhone / Samsung Calendar:</b> buka file .ics → <i>Tambahkan semua</i>. Alarmnya ikut.
                </li>
                <li>
                  <b className="text-ink">Google Calendar</b> (sekali saja): di laptop buka calendar.google.com → Setelan → <i>Tambahkan kalender → Buat kalender baru</i> “Ritme” → di
                  setelannya atur <i>Notifikasi acara</i> ke <b className="text-ink">0 menit</b> (Google mengabaikan alarm di file, jadi pakai notifikasi bawaan kalender ini).
                </li>
                <li>
                  Lalu <i>Setelan → Impor & ekspor → Impor</i> → pilih file → masukkan ke kalender “Ritme”. HP kamu akan berbunyi di setiap pergantian kegiatan.
                </li>
              </ol>
              <p className="text-xs text-faint">Ekspornya satu arah: kirim ulang setiap selesai menyusun jadwal (mis. tiap malam setelah Rencana besok).</p>
            </div>
          </details>
          )}
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

      {lockOk && (
        <Section title="Privasi">
          <Card>
            <Toggle
              label="Kunci dengan sidik jari / wajah"
              hint="Ritme minta verifikasi saat dibuka dan setelah 2 menit di latar. Ini tirai privasi kalau HP dipinjam, bukan enkripsi — tetap cadangkan datamu."
              checked={!!s.appLock}
              onChange={async (on) => {
                try {
                  if (on) {
                    const id = await createLock(s.name)
                    await setSetting('appLock', id)
                    lockFlag.set(true)
                    markUnlocked()
                    toast({ text: 'Kunci aktif. 🔒', tone: 'success' })
                  } else if (await verifyLock(s.appLock)) {
                    await setSetting('appLock', '')
                    lockFlag.set(false)
                    toast({ text: 'Kunci dimatikan.' })
                  }
                } catch {
                  toast({ text: 'Dibatalkan atau tidak didukung di perangkat ini.', tone: 'error' })
                }
              }}
            />
          </Card>
        </Section>
      )}

      <Section title="Data">
        <BackupCard />
      </Section>

      <p className="pb-2 text-center text-xs text-faint">
        Ritme v{__APP_VERSION__} · 100% di perangkat, tanpa akun, tanpa server, tanpa kunci API.
      </p>
    </div>
  )
}
