import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  // Check if building/serving the app (Tauri) or website
  const isAppBuild = !!process.env.VITE_APP_BUILD;
  // For app: set root to src/, for website: keep root as . (default)
  const appRoot = isAppBuild ? 'src' : '.';

  return {
  // Set root for dev server and build
  root: appRoot,
  // Use /Pulse/ for GitHub Pages deployment (repo name), ./ for Tauri app
  base: process.env.GITHUB_PAGES ? '/Pulse/' : './',
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      // @ alias always resolves to src directory
      "@": path.resolve(__dirname, './src'),
    },
  },
  // Tauri expects a fixed port, fail if that port is not available
  clearScreen: false,
  // tauri uses a different dev server port
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    // When root is set to src/, Vite automatically uses src/index.html
    // When root is '.', Vite automatically uses ./index.html
    // Tauri uses Chromium on Windows and WebKit on macOS and Linux
    target: process.env.TAURI_PLATFORM == 'windows' ? 'chrome105' : 'safari13',
    // don't minify for debug builds
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    // produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG,
  },
};
});


