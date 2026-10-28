import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true,
    port: 7891,
    allowedHosts: true,
    hmr: {
      clientPort: 7891,
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:7890',
        changeOrigin: true,
      },
      '/admin/api': {
        target: 'http://127.0.0.1:7890',
        changeOrigin: true,
      },
      '/users/api': {
        target: 'http://127.0.0.1:7890',
        changeOrigin: true,
      },
      '/portal/api': {
        target: 'http://127.0.0.1:7890',
        changeOrigin: true,
      },
      '/switch-kantor': {
        target: 'http://127.0.0.1:7890',
        changeOrigin: true,
      },
      '/static': {
        target: 'http://127.0.0.1:7890',
        changeOrigin: true,
      },
    },
  },
})
