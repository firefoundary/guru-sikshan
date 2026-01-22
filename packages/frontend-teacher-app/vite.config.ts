import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  
  envDir: './', // Or './' if the .env is in the same folder as this config
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 8080,
    host: true,
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
});