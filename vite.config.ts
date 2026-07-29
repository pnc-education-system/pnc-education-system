import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: 'localhost',
    port: 5173,
    proxy: {
      '/storage': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          // Vue sub-packages (check before generic vue to avoid greedy matching)
          if (id.includes('node_modules/vue-router')) {
            return 'vendor-router'
          }
          if (id.includes('node_modules/vue-i18n')) {
            return 'vendor-i18n'
          }
          if (id.includes('node_modules/vue-chartjs')) {
            return 'vendor-charts'
          }
          // Vue core + @vue/reactivity, @vue/runtime-core, etc.
          if (id.includes('node_modules/vue/') || id.includes('node_modules/@vue/')) {
            return 'vendor-vue'
          }
          if (id.includes('node_modules/pinia')) {
            return 'vendor-pinia'
          }
          // Charts
          if (id.includes('node_modules/chart.js')) {
            return 'vendor-charts'
          }
          // UI icons
          if (id.includes('node_modules/lucide-vue-next')) {
            return 'vendor-ui'
          }
          // Large utilities
          if (id.includes('node_modules/html2canvas') || id.includes('node_modules/jspdf')) {
            return 'vendor-pdf'
          }
          if (id.includes('node_modules/xlsx')) {
            return 'vendor-xlsx'
          }
          if (id.includes('node_modules/qrcode')) {
            return 'vendor-qrcode'
          }
          // HTTP client
          if (id.includes('node_modules/axios')) {
            return 'vendor-http'
          }
        },
      },
    },
    // Enable source maps only in dev for smaller production builds
    sourcemap: false,
    // Enable CSS code splitting for smaller CSS chunks
    cssCodeSplit: true,
  },
})
