import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Production-style packaging: Vite emits its build directly into the Spring Boot
// resources/static directory so `mvn package` bundles the SPA into the jar.
//
// Dev mode (npm run dev) starts Vite on :5173 and proxies /api -> Spring Boot
// on :8080. The same /api path works in prod because the jar serves both UI
// and API on a single origin -- no env-dependent code in the frontend.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../backend/src/main/resources/static',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
});
