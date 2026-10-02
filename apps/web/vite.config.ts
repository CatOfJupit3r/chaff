import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

/** The desktop dev runner loads the renderer from this port. */
const DEV_PORT = 3030;

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      quoteStyle: 'single',
      semicolons: true,
    }),
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
  resolve: {
    alias: {
      '@~': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: 'localhost',
    port: DEV_PORT,
    strictPort: true,
  },
  build: {
    target: 'chrome140',
    // The desktop app loads the bundle from disk, so one larger chunk costs nothing noticeable.
    chunkSizeWarningLimit: 1024,
  },
});
