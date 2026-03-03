import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
    'process.env': '{}',
  },
  resolve: {
    alias: {
      buffer: 'buffer',
    },
  },
  optimizeDeps: {
    include: ['buffer', 'bignumber.js', 'bech32'],
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          opnet:  ['opnet'],
          react:  ['react', 'react-dom'],
          motion: ['framer-motion'],
        },
      },
    },
  },
});
