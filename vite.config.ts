import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

function swVersionStamp(): Plugin {
  return {
    name: 'sw-version-stamp',
    closeBundle() {
      const swPath = path.resolve(__dirname, 'dist/sw.js')
      if (fs.existsSync(swPath)) {
        const buildHash = Date.now().toString(36)
        let content = fs.readFileSync(swPath, 'utf-8')
        content = content.replace(
          /const CACHE_VERSION = '[^']+'/,
          `const CACHE_VERSION = '${buildHash}'`
        )
        fs.writeFileSync(swPath, content)
      }
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), swVersionStamp()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: mode !== 'production',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/functions', 'firebase/storage', 'firebase/app-check'],
          'vendor-charts': ['recharts'],
          'vendor-jspdf': ['jspdf', 'jspdf-autotable'],
        },
      },
    },
  },
}))
