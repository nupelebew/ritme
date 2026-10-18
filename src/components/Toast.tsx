import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface ToastItem {
  id: number
  text: string
  action?: { label: string; run: () => void }
  tone?: 'info' | 'success' | 'error'
}

const Ctx = createContext<(t: Omit<ToastItem, 'id'>) => void>(() => {})
export const useToast = () => useContext(Ctx)

let seq = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const push = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = ++seq
    setItems((s) => [...s, { ...t, id }])
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), t.action ? 6000 : 3200)
  }, [])
  return (
    <Ctx.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-28 z-[60] flex flex-col items-center gap-2 px-4"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              'glass-strong pointer-events-auto flex min-h-11 w-full max-w-md items-center gap-3 rounded-2xl px-4 py-2 text-sm animate-rise',
              t.tone === 'error' && 'text-danger',
            )}
          >
            <span className="flex-1">{t.text}</span>
            {t.action && (
              <button
                type="button"
                className="min-h-11 rounded-xl px-3 font-semibold text-accent-2 hover:bg-white/5"
                onClick={() => {
                  t.action!.run()
                  setItems((s) => s.filter((x) => x.id !== t.id))
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
