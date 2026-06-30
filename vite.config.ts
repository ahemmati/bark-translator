import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'tfjs-wasm/*.wasm'],
      manifest: {
        name: 'Bark Translator',
        short_name: 'BarkTranslator',
        description: "Record your dog's bark and get a locally-trained guess at what they mean.",
        theme_color: '#fff7ed',
        background_color: '#fff7ed',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // TF.js wasm binaries are the largest assets; precache them so the
        // model still loads after the PWA goes offline.
        globPatterns: ['**/*.{js,css,html,svg,wasm}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      },
    }),
  ],
})
