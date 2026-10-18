import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, padding: 0.3, resizeOptions: { background: '#07070f' } },
    apple: { ...minimal2023Preset.apple, padding: 0.3, resizeOptions: { background: '#07070f' } },
  },
  images: ['public/favicon.svg'],
})
