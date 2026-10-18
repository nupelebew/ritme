/** Konfeti ringan (canvas, ±1,8 detik). Dilewati bila pengguna memilih kurangi gerakan. */
export function confetti(colors = ['#8b7bff', '#22d3ee', '#34f5a5', '#f472b6', '#fbbf24']) {
  if (typeof window === 'undefined' || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const c = document.createElement('canvas')
  c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:80'
  const dpr = Math.min(2, devicePixelRatio || 1)
  c.width = innerWidth * dpr
  c.height = innerHeight * dpr
  document.body.appendChild(c)
  const g = c.getContext('2d')!
  g.scale(dpr, dpr)
  const parts = Array.from({ length: 140 }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 80,
    y: innerHeight * 0.35,
    vx: (Math.random() - 0.5) * 14,
    vy: -Math.random() * 14 - 4,
    r: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.4,
    w: 6 + Math.random() * 6,
    h: 3 + Math.random() * 4,
    col: colors[Math.floor(Math.random() * colors.length)],
  }))
  const t0 = performance.now()
  const frame = (t: number) => {
    const k = (t - t0) / 1800
    g.clearRect(0, 0, innerWidth, innerHeight)
    for (const p of parts) {
      p.vy += 0.35
      p.vx *= 0.99
      p.x += p.vx
      p.y += p.vy
      p.r += p.vr
      g.save()
      g.globalAlpha = Math.max(0, 1 - k)
      g.translate(p.x, p.y)
      g.rotate(p.r)
      g.fillStyle = p.col
      g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
      g.restore()
    }
    if (k < 1) requestAnimationFrame(frame)
    else c.remove()
  }
  requestAnimationFrame(frame)
}
