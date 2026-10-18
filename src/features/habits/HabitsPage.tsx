import { useState } from 'react'
import { Flame, Plus } from 'lucide-react'
import { Card, EmptyState, Fab, PageHeader, Button } from '@/components/ui'
import type { Habit } from '@/db/types'
import { completionRate, currentStreak, isDue } from '@/lib/habits'
import { HabitDetail } from './HabitDetail'
import { HabitToggle, MiniCalendar, StreakBadge } from './HabitParts'
import { HabitSheet } from './HabitSheet'
import { toggleHabit, useHabits } from './useHabits'

export function HabitsPage() {
  const { habits, done, today, ready } = useHabits()
  const [detail, setDetail] = useState<Habit | null>(null)
  const [edit, setEdit] = useState<Habit | 'new' | null>(null)

  const dueToday = habits.filter((h) => isDue(h, today))
  const doneToday = dueToday.filter((h) => done(h.id).has(today)).length
  const best = habits.reduce((m, h) => Math.max(m, currentStreak(h, done(h.id), today)), 0)

  return (
    <div className="animate-rise space-y-4">
      <PageHeader
        eyebrow={habits.length ? `${doneToday}/${dueToday.length} hari ini · streak terbaik ${best} hari` : 'Kecil, tapi tiap hari'}
        title="Kebiasaan"
      />

      {ready && habits.length === 0 && (
        <EmptyState
          icon={Flame}
          title="Mulai satu kebiasaan kecil"
          body="Misalnya minum air, baca 10 halaman, atau jalan sore. Centang tiap hari dan jaga streak-mu."
          action={
            <Button variant="primary" icon={Plus} onClick={() => setEdit('new')}>
              Buat kebiasaan
            </Button>
          }
        />
      )}

      <ul className="space-y-3">
        {habits.map((h) => {
          const set = done(h.id)
          const checked = set.has(today)
          const due = isDue(h, today)
          return (
            <li key={h.id}>
              <Card className="p-0">
                <div className="flex items-center gap-3 p-3 pb-2">
                  <HabitToggle habit={h} checked={checked} due={due} onToggle={() => toggleHabit(h, today)} />
                  <button type="button" onClick={() => setDetail(h)} className="min-h-11 min-w-0 flex-1 text-left">
                    <span className="block truncate font-semibold">{h.name}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 whitespace-nowrap">
                      <StreakBadge n={currentStreak(h, set, today)} />
                      <span className="text-xs text-muted">{completionRate(h, set, today)}% dalam 30 hari</span>
                      {!due && <span className="text-xs text-faint">libur hari ini</span>}
                    </span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setDetail(h)}
                  className="block w-full px-3 pb-3 pt-1"
                  aria-label={`Lihat kalender ${h.name}`}
                >
                  <MiniCalendar habit={h} done={set} today={today} />
                </button>
              </Card>
            </li>
          )
        })}
      </ul>

      {habits.length > 0 && (
        <Fab icon={Plus} onClick={() => setEdit('new')}>
          Tambah kebiasaan
        </Fab>
      )}

      {detail && (
        <HabitDetail
          key={detail.id}
          habit={habits.find((h) => h.id === detail.id) ?? detail}
          done={done(detail.id)}
          today={today}
          onClose={() => setDetail(null)}
          onEdit={() => {
            setEdit(detail)
            setDetail(null)
          }}
        />
      )}
      {edit && <HabitSheet key={edit === 'new' ? 'new' : edit.id} habit={edit === 'new' ? undefined : edit} onClose={() => setEdit(null)} />}
    </div>
  )
}
