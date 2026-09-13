import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

/** WSL + /mnt/c has no inotify; without polling, HMR never sees Windows-side edits. */
function needsPollingWatch(): boolean {
  if (process.env.CHOKIDAR_USEPOLLING === 'true') return true;
  if (process.env.WSL_DISTRO_NAME) return true;
  const cwd = process.cwd().replace(/\\/g, '/');
  return cwd.startsWith('/mnt/');
}

const pollWatch = true //needsPollingWatch();

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: ['vite.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'ایدکس — مدیریت کلینیک دندان\u200Cپزشکی',
        short_name: 'ایدکس',
        description: 'سیستم مدیریت کلینیک دندان\u200Cپزشکی AIDEX',
        theme_color: '#1e2a3a',
        background_color: '#f8f9fa',
        display: 'standalone',
        dir: 'rtl',
        lang: 'fa',
        start_url: '/aidex_frontend/',
        scope: '/aidex_frontend/',
        categories: ['medical', 'health'],
        icons: [
          {
            src: '/aidex_frontend/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/aidex_frontend/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/aidex_frontend/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/aidex_frontend/vite.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/aidex_frontend/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Cache Google Fonts stylesheets
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
            },
          },
          {
            // Cache Google Fonts webfont files
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          {
            // Cache Supabase API responses (network-first for freshness)
            urlPattern: /^https:\/\/[a-z0-9]+\.supabase\.co\/rest\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 1 day
              },
              networkTimeoutSeconds: 5,
            },
          },
          {
            // Supabase auth must always hit the network
            urlPattern: /^https:\/\/[a-z0-9]+\.supabase\.co\/auth\//,
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    include: ['lucide-react'],
  },
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
    watch: pollWatch
      ? {
          usePolling: true,
          interval: 300,
          awaitWriteFinish: {
            stabilityThreshold: 200,
            pollInterval: 100,
          },
        }
      : {
          awaitWriteFinish: {
            stabilityThreshold: 150,
            pollInterval: 50,
          },
        },
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
      overlay: true,
    },
  },
});
