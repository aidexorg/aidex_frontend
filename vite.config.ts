import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
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
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
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
