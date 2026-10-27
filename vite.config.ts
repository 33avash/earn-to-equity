import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { coachMiddleware, newsMiddleware } from './server/coach';

export default defineConfig(({ mode }) => {
  // Server-only env: GEMINI_API_KEY is read here and never exposed to the client bundle
  // (only VITE_-prefixed variables are injected into client code).
  const env = loadEnv(mode, process.cwd(), '');
  return {
    // GitHub Pages serves the site from /<repo>/; BASE_PATH is set by the deploy workflow.
    base: process.env.BASE_PATH || '/',
    plugins: [
      react(),
      {
        name: 'e2e-coach-api',
        configureServer(server) {
          server.middlewares.use('/api/coach', coachMiddleware(env.GEMINI_API_KEY, env.GEMINI_MODEL || undefined));
          server.middlewares.use('/api/news', newsMiddleware());
        },
        configurePreviewServer(server) {
          server.middlewares.use('/api/coach', coachMiddleware(env.GEMINI_API_KEY, env.GEMINI_MODEL || undefined));
          server.middlewares.use('/api/news', newsMiddleware());
        },
      },
    ],
    resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
    build: {
      rollupOptions: {
        output: { manualChunks: { recharts: ['recharts'], vendor: ['react', 'react-dom', 'react-router-dom', 'zustand'] } },
      },
    },
    test: { globals: true, environment: 'node', include: ['tests/**/*.test.{ts,tsx}'] },
  };
});
