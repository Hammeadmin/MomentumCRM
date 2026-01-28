import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    // Let Vite/Rollup handle chunk splitting automatically
    // Manual chunks were causing circular dependency issues in production
    chunkSizeWarningLimit: 1000,
  },
});
