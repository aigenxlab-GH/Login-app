import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev mode: Vite runs on :5173 and proxies /api/* to Spring Boot on :8080.
// Prod mode (single JAR): React build is bundled into the JAR; both UI and API
// are served from the same origin, so relative /api paths need no proxy.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
