import { Route, Routes, useLocation } from 'react-router'
import { useEffect } from 'react'
import { BottomNav } from './BottomNav'
import { UpdatePrompt } from './UpdatePrompt'
import { useApplyTheme } from './useTheme'
import { ToastProvider } from '@/components/Toast'
import { TodayPage } from '@/features/today/TodayPage'
import { TasksPage } from '@/features/tasks/TasksPage'
import { FocusPage } from '@/features/focus/FocusPage'
import { FocusPill } from '@/features/focus/FocusPill'
import { useFocusEngine } from '@/features/focus/focus'
import { HabitsPage } from '@/features/habits/HabitsPage'
import { MorePage } from '@/features/more/MorePage'
import { PlanPage } from '@/features/plan/PlanPage'
import { ReviewPage } from '@/features/review/ReviewPage'
import { StatsPage } from '@/features/stats/StatsPage'
import { HistoryPage } from '@/features/stats/HistoryPage'
import { CategoriesPage } from '@/features/settings/CategoriesPage'
import { SettingsPage } from '@/features/settings/SettingsPage'

export function App() {
  useApplyTheme()
  useFocusEngine()
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <ToastProvider>
      <div className="aurora" aria-hidden>
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="grain" aria-hidden />
      <UpdatePrompt />
      <FocusPill />
      <main className="mx-auto min-h-dvh w-full max-w-2xl px-4 pb-32 pt-safe">
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/tugas" element={<TasksPage />} />
          <Route path="/fokus" element={<FocusPage />} />
          <Route path="/kebiasaan" element={<HabitsPage />} />
          <Route path="/lainnya" element={<MorePage />} />
          <Route path="/rencana" element={<PlanPage />} />
          <Route path="/rekap" element={<ReviewPage />} />
          <Route path="/statistik" element={<StatsPage />} />
          <Route path="/riwayat" element={<HistoryPage />} />
          <Route path="/kategori" element={<CategoriesPage />} />
          <Route path="/pengaturan" element={<SettingsPage />} />
          <Route path="*" element={<TodayPage />} />
        </Routes>
      </main>
      <BottomNav />
    </ToastProvider>
  )
}
