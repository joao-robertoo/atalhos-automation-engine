import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy para evitar CORS em desenvolvimento:
    // chamadas para /api/* são repassadas ao back-end em localhost:3000
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        // Remove o prefixo /api antes de encaminhar ao back-end
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});