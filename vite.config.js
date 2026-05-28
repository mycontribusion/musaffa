import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'pwa-192x192.png', 'pwa-512x512.png', 'icon.png'],
      manifest: {
        name: 'MusaffaPro',
        short_name: 'MusaffaPro',
        description: 'Your Interactive Quran Memorization Companion',
        theme_color: '#020617',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // Pre-cache the full app shell (JS, CSS, HTML, icons)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,woff,ttf}'],

        // Also pre-cache the static Quran data files at install time
        // so the app works offline from the very first revisit after install
        additionalManifestEntries: [
          { url: '/data/surahs.json', revision: null },
          { url: '/data/quran-ar.json', revision: null },
          { url: '/data/quran-en.json', revision: null },
          { url: '/data/mutashabihat.json', revision: null },
          { url: '/data/waqar114', revision: null },
        ],

       runtimeCaching: [
           // ── Recitation audio CDNs ──────────────────────────────────────────
           // Cache audio files for offline use
           {
             urlPattern: /everyayah\.com|verses\.quran\.com|cdn\.islamic\.network/,
             handler: 'CacheFirst',
             options: {
               cacheName: 'quran-audio-v1',
               expiration: {
                 maxEntries: 50, // Limit total number of audio files cached
                 maxAgeSeconds: 60 * 60 * 24 * 7, // 1 week
               },
               cacheableResponse: { statuses: [0, 200] }, // Cache opaque responses (status 0 from no-cors) and 200
             },
           },

          // ── Quran data files ───────────────────────────────────────────────
          // CacheFirst: these are large static blobs; serve from cache, update
          // in the background only when a new SW is installed.
          {
            urlPattern: /\/data\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'quran-data-v1',
              expiration: { maxEntries: 20 },
            },
          },

          // ── Google Fonts & other CDN assets ───────────────────────────────
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'fonts-cache-v1' },
          },

          // ── Everything else ────────────────────────────────────────────────
          {
            urlPattern: /^https?.*/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'general-cache-v1' },
          },
        ],
      },
    })
  ]
})

