import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // Only bucket libraries that are legitimately shared across the sync
        // entry graph. Everything else (pdf, supabase, framer, radix, charts…)
        // is left to Rollup so those heavy libraries stay bound to the lazy
        // route chunks that actually use them and don't get modulepreloaded
        // on the homepage.
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return;
          if (id.includes("react-helmet")) return "helmet";
          if (id.includes("react-router") || id.includes("@remix-run/router")) return "router";
          if (id.includes("@tanstack")) return "react-query";
        },
      },
    },
  },
}));
