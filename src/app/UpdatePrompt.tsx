import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui'
import { useToast } from '@/components/Toast'

export function UpdatePrompt() {
  const toast = useToast()
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW()

  useEffect(() => {
    if (offlineReady) {
      toast({ text: 'Ritme siap dipakai tanpa internet.', tone: 'success' })
      setOfflineReady(false)
    }
  }, [offlineReady, setOfflineReady, toast])

  if (!needRefresh) return null
  return (
    <div className="fixed inset-x-0 top-0 z-[70] flex justify-center px-3 pt-safe">
      <div className="glass-strong flex w-full max-w-md items-center gap-2 rounded-2xl p-2 pl-4 text-sm animate-rise">
        <span className="flex-1">Versi baru Ritme tersedia.</span>
        <Button variant="ghost" size="sm" onClick={() => setNeedRefresh(false)}>
          Nanti
        </Button>
        <Button variant="primary" size="sm" icon={RefreshCw} onClick={() => updateServiceWorker(true)}>
          Perbarui
        </Button>
      </div>
    </div>
  )
}
