import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { palette } from './palette.js';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // The app is useless without its own data and talks to no server, so the
      // shell is precached whole and served from the cache first. Opening it
      // on a phone with no signal has to be indistinguishable from opening it
      // on wifi.
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      manifest: {
        // An explicit id pins the installed app's identity. Without one the
        // browser derives it from start_url, and changing start_url later would
        // orphan an already-installed copy — with the Ledger inside it.
        id: '/',
        name: 'Trade Tracker',
        short_name: 'Trades',
        description: 'Sizes the trade before you take it, and keeps the log on your phone.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: palette.ground,
        theme_color: palette.ground,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
});
