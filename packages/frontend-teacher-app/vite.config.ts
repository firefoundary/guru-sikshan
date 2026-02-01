import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';  // ✅ Changed to swc for consistency
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 8080,  // Teacher app stays on 8080
    host: true,
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
});
