import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarClock, LayoutTemplate, Plus, Search, Share2, Undo2 } from 'lucide-react'
import { Button, EmptyState, Fab, IconButton, PageHeader } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { db } from '@/db/db'
import { eventsForDate, updateOccurrence } from '@/db/events'
import { useCategories } from '@/db/hooks'
import { useSettings } from '@/db/settings'
import type { DateKey, Task } from '@/db/types'
import { HabitStrip } from '@/features/habits/HabitStrip'
import { EveningBanner } from '@/features/reminders/EveningBanner'
import { totalMin, useSessionsOn } from '@/features/focus/useSessions'
import { TaskSheet } from '@/features/tasks/TaskSheet'
import { TopThree } from '@/features/tasks/TopThree'
import { useTasks, useToggleTask } from '@/features/tasks/useTasks'
import { fmt, greeting, nowMinutes, todayKey } from '@/lib/date'
import type { Occurrence } from '@/lib/schedule'
import { useNow } from '@/lib/useNow'
import { DayStrip } from './DayStrip'
import { DaySummary } from './DaySummary'
import { EventSheet, type EventDraft } from './EventSheet'
import { Timeline } from './Timeline'
import { BedtimeWarning, EnergyCheck, SpecialSoon, WeekTargets } from './SmartCards'
import { TemplateSheet } from './TemplateSheet'
import { renderDayImage, shareOrDownload } from '@/lib/shareImage'

export function TodayPage() {
  const [params, setParams] = useSearchParams()
  const today = todayKey()
  const date: DateKey = params.get('d') ?? today
  const setDate = (d: DateKey) => setParams(d === today ? {} : { d }, { replace: true })

  const settings = useSettings()
  const { map: categories, list } = useCategories()
  const now = useNow()
  const isToday = date === today
  const nowMin = isToday ? nowMinutes(now) : undefined
  const toast = useToast()

  const items = useLiveQuery(() => eventsForDate(db, date), [date])
  const [editing, setEditing] = useState<Occurrence | null>(null)
  const [draft, setDraft] = useState<EventDraft | null>(null)
  const tasks = useTasks()
  const sessions = useSessionsOn(date)
  const toggleTask = useToggleTask()
  const [openTask, setOpenTask] = useState<Task | null>(null)
  const [templates, setTemplates] = useState(false)

  // Perluas rentang jam bila ada kegiatan di luar jam aktif
  const startHour = Math.min(settings.dayStartHour, ...(items ?? []).map((o) => Math.floor(o.start / 60)))
  const endHour = Math.max(settings.dayEndHour, ...(items ?? []).map((o) => Math.ceil(o.end / 60)))

  const newAt = (start: number) => setDraft({ date, start, end: start + 60, categoryId: list[0]?.id })
  const quickAdd = () => {
    const base = nowMin !== undefined ? Math.ceil((nowMin + 1) / 30) * 30 : settings.dayStartHour * 60 + 180
    newAt(Math.min(base, endHour * 60 - 60))
  }

  const onChange = async (o: Occurrence, start: number, end: number) => {
    const before = { start: o.start, end: o.end }
    await updateOccurrence(db, o, { start, end }, 'one')
    toast({
      text: o.masterId ? 'Dipindah untuk hari ini saja.' : 'Jadwal dipindah.',
      action: o.masterId
        ? undefined
        : { label: 'Urungkan', run: () => void db.events.update(o.id, before) },
    })
  }

  return (
    <div className="animate-rise space-y-4">
      <PageHeader
        eyebrow={`${greeting(now)}${settings.name ? `, ${settings.name}` : ''} 👋`}
        title={isToday ? 'Hari ini' : fmt(date, 'EEEE')}
        action={
          <div className="flex items-center gap-1">
            {!isToday && (
              <Button size="sm" icon={Undo2} onClick={() => setDate(today)}>
                Ke hari ini
              </Button>
            )}
            <Link to="/cari" aria-label="Cari" className="grid size-11 place-items-center rounded-2xl text-muted hover:bg-white/8 hover:text-ink">
              <Search className="size-5" aria-hidden />
            </Link>
          </div>
        }
      />
      <p className="-mt-4 text-sm text-muted">{fmt(date, 'EEEE, d MMMM yyyy')}</p>

      {isToday && <EveningBanner />}

      {isToday && <SpecialSoon />}

      <DayStrip value={date} onChange={setDate} />

      {items && (
        <DaySummary
          items={items}
          categories={categories}
          startHour={startHour}
          endHour={endHour}
          nowMin={nowMin}
          focusMin={totalMin(sessions ?? [])}
        />
      )}

      {isToday && tasks.ready && (
        <TopThree
          ranked={tasks.ranked.slice(0, 3)}
          doneToday={tasks.doneToday}
          categories={categories}
          today={today}
          onToggle={toggleTask}
          onOpen={setOpenTask}
          showLink
        />
      )}

      {isToday && <EnergyCheck />}

      {isToday && <HabitStrip />}

      {isToday && <WeekTargets />}

      {items && items.length > 0 && <BedtimeWarning lastEnd={Math.max(...items.map((o) => o.end))} />}

      <section aria-label="Timeline" className="glass relative rounded-3xl px-3 pb-2 pt-5">
        <div className="absolute right-1 top-1 z-20 flex">
          <IconButton
            icon={Share2}
            label="Bagikan jadwal sebagai gambar"
            onClick={async () => {
              if (!items) return
              const blob = await renderDayImage(date, items, categories, settings.name || undefined)
              const r = await shareOrDownload(new File([blob], `jadwal-${date}.png`, { type: 'image/png' }))
              if (r === 'downloaded') toast({ text: 'Gambar jadwal diunduh.', tone: 'success' })
            }}
          />
          <IconButton icon={LayoutTemplate} label="Template hari" onClick={() => setTemplates(true)} />
        </div>
        {items && items.length === 0 && (
          <EmptyState
            icon={CalendarClock}
            title="Belum ada kegiatan"
            body="Ketuk jam mana pun di bawah, atau pakai tombol Tambah. Bisa juga susun otomatis dari menu Rencana besok."
          />
        )}
        {items && (
          <Timeline
            key={date}
            items={items}
            categories={categories}
            startHour={startHour}
            endHour={endHour}
            nowMin={nowMin}
            onCreateAt={newAt}
            onOpen={setEditing}
            onChange={onChange}
          />
        )}
      </section>

      <Fab icon={Plus} onClick={quickAdd}>
        Tambah kegiatan
      </Fab>

      {templates && items && <TemplateSheet date={date} items={items} onClose={() => setTemplates(false)} />}
      {openTask && <TaskSheet key={openTask.id} task={openTask} onClose={() => setOpenTask(null)} />}
      {editing && <EventSheet key={editing.key} occurrence={editing} onClose={() => setEditing(null)} />}
      {draft && <EventSheet key={`new-${draft.start}`} draft={draft} onClose={() => setDraft(null)} />}
    </div>
  )
}
