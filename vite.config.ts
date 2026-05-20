import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Use src/index.html for Tauri app, index.html for website
  const isTauri = !!process.env.TAURI_ENV_DEBUG || !!process.env.TAURI_ENV_FAMILY;
  const inputFile = isTauri ? 'src/index.html' : 'index.html';

  return {
  // Use /Pulse/ for GitHub Pages deployment (repo name), ./ for Tauri development
  base: process.env.GITHUB_PAGES ? '/Pulse/' : './',
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
  // Tauri expects a fixed port, fail if that port is not available
  clearScreen: false,
  // tauri uses a different dev server port
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    rollupOptions: {
      input: inputFile,
    },
    // Tauri uses Chromium on Windows and WebKit on macOS and Linux
    target: process.env.TAURI_PLATFORM == 'windows' ? 'chrome105' : 'safari13',
    // don't minify for debug builds
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    // produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG,
  },
};
});

