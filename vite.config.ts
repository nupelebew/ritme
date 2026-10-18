import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

// BASE bisa diatur saat build untuk GitHub Pages, mis. BASE=/ritme/
const base = process.env.BASE ?? '/'

export default defineConfig({
  base,
  define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '1.0.0') },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      // Service worker buatan sendiri (src/sw.ts): offline + tombol notifikasi + ringkasan pagi
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: { globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'] },
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Ritme — Jadwal Harian',
        short_name: 'Ritme',
        description: 'Jadwal harian, tugas, kebiasaan, dan fokus. Offline, gratis, datamu tetap di perangkat.',
        lang: 'id',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#07070f',
        theme_color: '#07070f',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // Tekan lama ikon aplikasi → pintasan
        shortcuts: [
          { name: 'Hari ini', url: './#/', icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'Tambah tugas', url: './#/tugas?baru=1', icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'Mulai fokus', url: './#/fokus?mulai=1', icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'Rencana besok', url: './#/rencana', icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }] },
        ],
        // Bagikan teks dari aplikasi lain → Ritme (Android, aplikasi terpasang)
        share_target: { action: './', method: 'GET', params: { title: 'title', text: 'text', url: 'url' } },
      },
    }),
  ],
  test: { environment: 'node', setupFiles: ['./src/test-setup.ts'] },
})
