import { useEffect } from 'react'
import { useSettings } from '@/db/settings'

export function resolveTheme(t: 'dark' | 'light' | 'system') {
  if (t !== 'system') return t
  return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function useApplyTheme() {
  const { theme, accent } = useSettings()
  useEffect(() => {
    if (accent === 'aurora') delete document.documentElement.dataset.accent
    else document.documentElement.dataset.accent = accent
    try {
      localStorage.setItem('ritme-accent', accent)
    } catch {
      /* mode privat */
    }
  }, [accent])

  useEffect(() => {
    const apply = () => {
      const t = resolveTheme(theme)
      document.documentElement.dataset.theme = t
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', t === 'light' ? '#eef0fb' : '#07070f')
    }
    apply()
    try {
      localStorage.setItem('ritme-theme', theme)
    } catch {
      /* mode privat */
    }
    if (theme !== 'system') return
    const mq = matchMedia('(prefers-color-scheme: light)')
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
}
