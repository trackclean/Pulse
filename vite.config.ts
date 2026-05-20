import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const isAppBuild = !!process.env.VITE_APP_BUILD;

  return {
  base: process.env.GITHUB_PAGES ? '/Pulse/' : './',
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  clearScreen: false,
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    rollupOptions: {
      input: isAppBuild ? 'src/index.html' : 'index.html',
    },
    target: process.env.TAURI_PLATFORM == 'windows' ? 'chrome105' : 'safari13',
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
};
});


