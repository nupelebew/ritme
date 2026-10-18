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

/** Lima pertama = palet kategori bawaan yang lolos validasi (kontras & buta warna) di mode gelap */
export const PALETTE = [
  '#8b5cf6',
  '#0891b2',
  '#d97706',
  '#16a34a',
  '#c026d3',
  '#6366f1',
  '#0ea5e9',
  '#65a30d',
  '#ea580c',
  '#e11d48',
  '#db2777',
  '#64748b',
]

/** Warna hex -> rgba dengan alpha */
export const alpha = (hex: string, a: number) => `color-mix(in srgb, ${hex} ${Math.round(a * 100)}%, transparent)`
