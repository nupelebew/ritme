import { Monitor, Moon, Sun } from 'lucide-react'
import { BackHeader } from '@/components/BackHeader'
import { Card, Field } from '@/components/ui'
import { setSetting, useSettings, type Settings } from '@/db/settings'
import { cn } from '@/lib/cn'
import { BackupCard } from './BackupCard'

const themes: { v: Settings['theme']; label: string; icon: typeof Sun }[] = [
  { v: 'dark', label: 'Gelap', icon: Moon },
  { v: 'light', label: 'Terang', icon: Sun },
  { v: 'system', label: 'Ikut sistem', icon: Monitor },
]

export function SettingsPage() {
  const s = useSettings()
  return (
    <div className="animate-rise space-y-4">
      <BackHeader title="Pengaturan" />

      <Card className="space-y-4">
        <Field label="Nama panggilan" hint="Dipakai untuk sapaan dan di prompt AI.">
          <input
            className="field"
            defaultValue={s.name}
            key={s.name}
            placeholder="mis. Raka"
            onBlur={(e) => setSetting('name', e.target.value.trim())}
          />
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
      </Card>

      <BackupCard />
    </div>
  )
}
