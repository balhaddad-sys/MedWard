import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// WARNING: Do NOT add Cross-Origin-Embedder-Policy (COEP) unless this app
// requires cross-origin isolation (SharedArrayBuffer, etc.). COEP breaks
// CDN resources, iframes, images, and Firebase Auth if misconfigured.

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
