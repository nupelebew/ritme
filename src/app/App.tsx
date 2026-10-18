import { Route, Routes, useLocation } from 'react-router'
import { lazy, Suspense, useEffect } from 'react'
import { BottomNav } from './BottomNav'
import { UpdatePrompt } from './UpdatePrompt'
import { useApplyTheme } from './useTheme'
import { ToastProvider } from '@/components/Toast'
import { TodayPage } from '@/features/today/TodayPage'
import { TasksPage } from '@/features/tasks/TasksPage'
import { FocusPage } from '@/features/focus/FocusPage'
import { FocusPill } from '@/features/focus/FocusPill'
import { useFocusEngine } from '@/features/focus/focus'
import { useReminders } from '@/features/reminders/useReminders'
import { useAgenda } from '@/features/reminders/useAgenda'
import { ShareSheet } from '@/features/share/ShareSheet'
import '@/lib/install'
import { HabitsPage } from '@/features/habits/HabitsPage'
import { MorePage } from '@/features/more/MorePage'
import { db } from '@/db/db'
import { purgeTrash } from '@/db/trash'

// Halaman yang jarang dibuka dimuat terpisah (tetap di-precache untuk offline)
const PlanPage = lazy(() => import('@/features/plan/PlanPage').then((m) => ({ default: m.PlanPage })))
const ReviewPage = lazy(() => import('@/features/review/ReviewPage').then((m) => ({ default: m.ReviewPage })))
const StatsPage = lazy(() => import('@/features/stats/StatsPage').then((m) => ({ default: m.StatsPage })))
const HistoryPage = lazy(() => import('@/features/stats/HistoryPage').then((m) => ({ default: m.HistoryPage })))
const CategoriesPage = lazy(() => import('@/features/settings/CategoriesPage').then((m) => ({ default: m.CategoriesPage })))
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const SearchPage = lazy(() => import('@/features/search/SearchPage').then((m) => ({ default: m.SearchPage })))
const ThesisPage = lazy(() => import('@/features/thesis/ThesisPage').then((m) => ({ default: m.ThesisPage })))
const TrashPage = lazy(() => import('@/features/settings/TrashPage').then((m) => ({ default: m.TrashPage })))

export function App() {
  useApplyTheme()
  useFocusEngine()
  useReminders()
  useAgenda()
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  useEffect(() => {
    void purgeTrash(db)
  }, [])

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
      <ShareSheet />
      <main className="mx-auto min-h-dvh w-full max-w-2xl px-4 pb-32 pt-safe">
        <Suspense fallback={<div className="py-20 text-center text-sm text-faint">Memuat…</div>}>
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
          <Route path="/cari" element={<SearchPage />} />
          <Route path="/sampah" element={<TrashPage />} />
          <Route path="/skripsi" element={<ThesisPage />} />
          <Route path="*" element={<TodayPage />} />
        </Routes>
        </Suspense>
      </main>
      <BottomNav />
    </ToastProvider>
  )
}
