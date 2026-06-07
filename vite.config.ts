import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), tailwindcss(), react()],
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react-router-dom",
      "framer-motion",
      "sonner",
      "@supabase/supabase-js",
      "lucide-react",
      "class-variance-authority",
      "clsx",
      "tailwind-merge",
      "zod",
      "recharts",
      "cmdk",
      "vaul",
      "input-otp",
    ],
  },
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
    headers: {
      "Cache-Control": "no-store",
    },
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
