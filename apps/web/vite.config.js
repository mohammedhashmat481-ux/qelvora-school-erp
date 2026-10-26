import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3600,
    proxy: {
      '/api': {
        target: 'http://localhost:8010',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    target: 'esnext',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Split vendor code into separate long-cached chunks
        manualChunks(id) {
          // React core and scheduler
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler/')) {
            return 'vendor-react';
          }
          // React Router
          if (id.includes('node_modules/react-router')) {
            return 'vendor-router';
          }
          // Radix UI component library
          if (id.includes('node_modules/@radix-ui/')) {
            return 'vendor-radix';
          }
          // Maps / Leaflet — large, only used on /location
          if (id.includes('node_modules/leaflet') || id.includes('node_modules/react-leaflet')) {
            return 'vendor-maps';
          }
          // QR Scanner libs — large, only used on /safe-pickup & /logout-kiosk
          if (id.includes('node_modules/html5-qrcode') || id.includes('node_modules/@yudiel') || id.includes('node_modules/qrcode')) {
            return 'vendor-qr';
          }
          // Excel export — large, only used on admin/fees
          if (id.includes('node_modules/xlsx')) {
            return 'vendor-xlsx';
          }
          // Socket.IO client — only needed on live pages
          if (id.includes('node_modules/socket.io-client') || id.includes('node_modules/engine.io-client')) {
            return 'vendor-socket';
          }
          // i18n — translation bundle
          if (id.includes('node_modules/i18next') || id.includes('node_modules/react-i18next')) {
            return 'vendor-i18n';
          }
          // Lucide icons
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
        },
        // Use content hash for cache-busting
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
});

