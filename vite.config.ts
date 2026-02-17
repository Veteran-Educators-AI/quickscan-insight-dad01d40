import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Hardcoded fallback values for Cloud env vars
// UPDATED: Now pointing to NYClogic AI (Scholar Quest) shared database
const FALLBACK_SUPABASE_URL = 'https://rjlqmfthemfpetpcydog.supabase.co';
const FALLBACK_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqbHFtZnRoZW1mcGV0cGN5ZG9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MzA4NTQsImV4cCI6MjA4MzMwNjg1NH0.qBSiyTKAWxP95UVpDS3nphi5vbVKV20ENNQiDw10IbA';
const FALLBACK_SUPABASE_PROJECT_ID = 'rjlqmfthemfpetpcydog';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      // Always define these with fallbacks to ensure they're available
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
        env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL
      ),
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(
        env.VITE_SUPABASE_PUBLISHABLE_KEY || FALLBACK_SUPABASE_KEY
      ),
      'import.meta.env.VITE_SUPABASE_PROJECT_ID': JSON.stringify(
        env.VITE_SUPABASE_PROJECT_ID || FALLBACK_SUPABASE_PROJECT_ID
      ),
    },
    build: {
      target: "esnext",
    },
    optimizeDeps: {
      esbuildOptions: {
        target: "esnext",
      },
    },
  };
});
