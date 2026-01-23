import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "popper.js": path.resolve(__dirname, "./node_modules/popper.js/dist/popper.js"),
    },
  },
  optimizeDeps: {
    exclude: ["popper.js"],
    esbuildOptions: {
      sourcemap: false,
    },
  },
  build: {
    sourcemap: false,
  },
}));
