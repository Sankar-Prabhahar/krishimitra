import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      "teachers-feb-inns-captured.trycloudflare.com",
    ],
    proxy: {
      "/api/market": {
        target: "https://api.data.gov.in",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/market/, "/resource"),
        secure: false,
      },
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/audio": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
