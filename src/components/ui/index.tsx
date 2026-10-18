import { useEffect, useRef, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

/** Tombol aksi melayang di atas navigasi bawah (dirender ke body supaya posisinya selalu relatif ke layar) */
export function Fab({ className, ...p }: ButtonProps) {
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-[104px] z-30 mx-auto flex max-w-2xl justify-end px-4">
      <Button variant="primary" className={cn('pointer-events-auto min-h-13 rounded-full px-5 shadow-xl', className)} {...p} />
    </div>,
    document.body,
  )
}

export function Card({ className, ...p }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('glass rounded-3xl p-4', className)} {...p} />
}

type Variant = 'primary' | 'soft' | 'ghost' | 'danger'
const variants: Record<Variant, string> = {
  primary:
    'bg-[linear-gradient(110deg,var(--accent),var(--accent-2))] text-on-accent font-semibold shadow-[0_8px_24px_-8px_var(--accent)] hover:brightness-110',
  soft: 'glass text-ink hover:bg-white/10',
  ghost: 'text-muted hover:text-ink hover:bg-white/5',
  danger: 'bg-danger/15 text-danger hover:bg-danger/25 font-medium',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  icon?: LucideIcon
  size?: 'md' | 'sm'
}

export function Button({ variant = 'soft', icon: Icon, size = 'md', className, children, ...p }: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex min-h-11 select-none items-center justify-center gap-2 rounded-2xl transition active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40',
        size === 'md' ? 'px-4 text-sm' : 'px-3 text-[13px]',
        variants[variant],
        className,
      )}
      {...p}
    >
      {Icon && <Icon className="size-[18px] shrink-0" aria-hidden />}
      {children}
    </button>
  )
}

export function IconButton({
  icon: Icon,
  label,
  className,
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex size-11 shrink-0 items-center justify-center rounded-2xl text-muted transition hover:bg-white/8 hover:text-ink active:scale-95',
        className,
      )}
      {...p}
    >
      <Icon className="size-5" aria-hidden />
    </button>
  )
}

export function PageHeader({ eyebrow, title, action }: { eyebrow?: ReactNode; title: ReactNode; action?: ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-3 pb-4 pt-2">
      <div className="min-w-0">
        {eyebrow && <p className="text-[13px] font-medium text-muted">{eyebrow}</p>}
        <h1 className="font-display text-[28px] font-semibold leading-tight tracking-tight">{title}</h1>
      </div>
      {action}
    </header>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon
  title: string
  body?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center animate-rise">
      <div className="mb-4 grid size-16 place-items-center rounded-3xl glass">
        <Icon className="size-7 text-accent-2" aria-hidden />
      </div>
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {body && <p className="mt-1 max-w-xs text-sm text-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/** Lembar bawah (bottom sheet) untuk formulir. Di layar lebar tampil sebagai dialog. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const first = ref.current?.querySelector<HTMLElement>('input, textarea, select, button[data-autofocus]')
    first?.focus({ preventScroll: true })
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      prev?.focus?.()
    }
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="presentation">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade" onClick={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="glass-strong relative flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-[28px] animate-sheet sm:rounded-[28px]"
      >
        <div className="flex items-center justify-between gap-2 px-5 pt-4">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <IconButton icon={X} label="Tutup" onClick={onClose} className="-mr-2" />
        </div>
        <div className="scroll-thin flex-1 overflow-y-auto overflow-x-hidden px-5 pb-4 pt-2">{children}</div>
        {footer && <div className="flex gap-2 border-t border-line px-5 pb-safe pt-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[13px] font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="block text-xs text-faint">{hint}</span>}
    </label>
  )
}

/** Sakelar on/off dengan label & keterangan; seluruh baris bisa diketuk */
export function Toggle({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string
  hint?: ReactNode
  checked: boolean
  disabled?: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex min-h-12 w-full items-center gap-3 text-left disabled:opacity-40"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <span
        className={cn('relative h-7 w-12 shrink-0 rounded-full transition', checked ? 'bg-[linear-gradient(110deg,var(--accent),var(--accent-2))]' : 'bg-white/12')}
        aria-hidden
      >
        <span className={cn('absolute top-1 size-5 rounded-full bg-white shadow transition-all', checked ? 'left-6' : 'left-1')} />
      </span>
    </button>
  )
}

export function Chip({
  active,
  color,
  className,
  children,
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; color?: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm transition',
        active ? 'border-transparent bg-white/12 text-ink' : 'border-line text-muted hover:text-ink',
        className,
      )}
      style={active && color ? { background: `color-mix(in srgb, ${color} 22%, transparent)`, borderColor: color } : undefined}
      {...p}
    >
      {color && <span className="size-2.5 rounded-full" style={{ background: color }} aria-hidden />}
      {children}
    </button>
  )
}
