import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React core - rarely changes, can be cached long-term
          if (id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router-dom/')) {
            return 'react-vendor';
          }

          // Query & State management
          if (id.includes('node_modules/@tanstack/')) {
            return 'query-vendor';
          }

          // Supabase client
          if (id.includes('node_modules/@supabase/')) {
            return 'supabase-vendor';
          }

          // Charts & visualization - large, loaded on demand
          if (id.includes('node_modules/recharts/')) {
            return 'charts-vendor';
          }

          // Drag & drop - used by dashboard and kanban
          if (id.includes('node_modules/@dnd-kit/')) {
            return 'dnd-vendor';
          }

          // Date utilities
          if (id.includes('node_modules/date-fns/')) {
            return 'date-vendor';
          }
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
  },
});
