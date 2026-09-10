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

const pollWatch = needsPollingWatch();

export default defineConfig({
  base: '/aidex_frontend/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: ['vite.svg'],
      manifest: {
        name: 'ایدکس — مدیریت کلینیک دندان‌پزشکی',
        short_name: 'ایدکس',
        description: 'سیستم مدیریت کلینیک دندان‌پزشکی AIDEX',
        theme_color: '#1e2a3a',
        background_color: '#f8f9fa',
        display: 'standalone',
        dir: 'rtl',
        lang: 'fa',
        start_url: '/aidex_frontend/',
        scope: '/aidex_frontend/',
        icons: [
          {
            src: '/aidex_frontend/vite.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/aidex_frontend/vite.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/aidex_frontend/index.html',
        navigateFallbackDenylist: [/^\/api\//],
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
