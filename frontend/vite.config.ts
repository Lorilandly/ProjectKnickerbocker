import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // Proxy API requests to the Rust backend in dev so the SPA and API
    // share the same origin and CORS isn't needed.
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
