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
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return;
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("@tanstack")) return "react-query";
          if (id.includes("react-helmet")) return "helmet";
          // Split each Radix primitive into its own chunk so unused ones aren't
          // pulled into pages that don't use them.
          const radixMatch = id.match(/@radix-ui[\\/]([^\\/]+)/);
          if (radixMatch) return `radix-${radixMatch[1]}`;
          if (id.includes("framer-motion")) return "framer";
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          if (id.includes("react-router")) return "router";
          if (id.includes("date-fns")) return "date-fns";
          if (id.includes("lucide-react")) return "lucide";
          if (id.includes("@react-pdf") || id.includes("jspdf")) return "pdf";
          if (id.includes("dompurify") || id.includes("marked")) return "markdown";
        },
      },
    },
  },
}));
