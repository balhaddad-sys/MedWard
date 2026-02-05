import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// WARNING: Do NOT add Cross-Origin-Opener-Policy (COOP) or
// Cross-Origin-Embedder-Policy (COEP) headers. COOP breaks Firebase Auth
// signInWithPopup because Google's auth page sets its own strict COOP,
// severing the popup-to-opener connection. The browser default is correct.

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
