import { Component, type ReactNode } from 'react'

/** Penyelamat: kalau ada crash, tawarkan muat ulang + aktifkan versi terbaru service worker. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {}

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  reload = async () => {
    try {
      const reg = await navigator.serviceWorker?.getRegistration()
      reg?.waiting?.postMessage({ type: 'SKIP_WAITING' })
    } catch {
      /* abaikan */
    }
    setTimeout(() => location.reload(), 300)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="grid min-h-dvh place-items-center p-6 text-center">
        <div className="glass max-w-sm rounded-3xl p-6">
          <h1 className="font-display text-xl font-semibold">Ups, ada yang macet</h1>
          <p className="mt-2 text-sm text-muted">
            Datamu aman di perangkat. Coba muat ulang; versi terbaru akan dipasang otomatis.
          </p>
          <pre className="mt-3 max-h-24 overflow-auto rounded-xl bg-black/20 p-2 text-left text-[11px] text-faint">
            {this.state.error.message}
          </pre>
          <button
            type="button"
            onClick={this.reload}
            className="mt-4 min-h-11 w-full rounded-2xl bg-[linear-gradient(110deg,var(--accent),var(--accent-2))] font-semibold text-on-accent"
          >
            Muat ulang Ritme
          </button>
        </div>
      </div>
    )
  }
}
