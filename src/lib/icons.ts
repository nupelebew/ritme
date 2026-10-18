import {
  BookOpen,
  Briefcase,
  Code2,
  Coffee,
  Dumbbell,
  Gamepad2,
  GraduationCap,
  Heart,
  Home,
  Moon,
  Music,
  PenLine,
  ShoppingCart,
  Sparkles,
  Sun,
  Users,
  Utensils,
  type LucideIcon,
} from 'lucide-react'

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'graduation-cap': GraduationCap,
  briefcase: Briefcase,
  home: Home,
  coffee: Coffee,
  heart: Heart,
  book: BookOpen,
  code: Code2,
  pen: PenLine,
  dumbbell: Dumbbell,
  music: Music,
  gamepad: Gamepad2,
  utensils: Utensils,
  cart: ShoppingCart,
  users: Users,
  sun: Sun,
  moon: Moon,
  sparkles: Sparkles,
}

export const iconFor = (name?: string): LucideIcon => CATEGORY_ICONS[name ?? ''] ?? Sparkles

export const PALETTE = [
  '#8b5cf6',
  '#6366f1',
  '#22d3ee',
  '#0ea5e9',
  '#34d399',
  '#a3e635',
  '#f59e0b',
  '#fb923c',
  '#f472b6',
  '#fb7185',
  '#e879f9',
  '#94a3b8',
]

/** Warna hex -> rgba dengan alpha */
export const alpha = (hex: string, a: number) => `color-mix(in srgb, ${hex} ${Math.round(a * 100)}%, transparent)`
