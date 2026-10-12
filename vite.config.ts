import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { coachMiddleware } from './server/coach';

export default defineConfig(({ mode }) => {
  // Server-only env: GEMINI_API_KEY is read here and never exposed to the client bundle
  // (only VITE_-prefixed variables are injected into client code).
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      react(),
      {
        name: 'e2e-coach-api',
        configureServer(server) {
          server.middlewares.use('/api/coach', coachMiddleware(env.GEMINI_API_KEY, env.GEMINI_MODEL || undefined));
        },
        configurePreviewServer(server) {
          server.middlewares.use('/api/coach', coachMiddleware(env.GEMINI_API_KEY, env.GEMINI_MODEL || undefined));
        },
      },
    ],
    resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
    build: {
      rollupOptions: {
        output: { manualChunks: { recharts: ['recharts'], vendor: ['react', 'react-dom', 'react-router-dom', 'zustand'] } },
      },
    },
    test: { globals: true, environment: 'node', include: ['tests/**/*.test.ts'] },
  };
});
