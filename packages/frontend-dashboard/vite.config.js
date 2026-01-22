import path from "path";
import react from "@vitejs/plugin-react-swc"; // (Or @vitejs/plugin-react)
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  
  resolve: {
    alias: {
      // 1. Fix "Double React" Crash
      react: path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
      
      // 2. Fix "Missing @" Crash
      "@": path.resolve(__dirname, "./src"),
    },
  },

  server: {
    port: 5173, // Default Vite port for Dashboard
  },
});