import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from "fs";

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  // Check if building/serving the app (Tauri) or website
  const isAppBuild = !!process.env.VITE_APP_BUILD;
  const inputFile = isAppBuild ? 'src/index.html' : 'index.html';

  return {
  // Keep root as project root for proper module resolution
  root: '.',
  // Use /Pulse/ for GitHub Pages deployment (repo name), ./ for Tauri app
  base: process.env.GITHUB_PAGES ? '/Pulse/' : './',
  server: {
    host: "::",
    port: 8080,
    // Custom middleware to serve correct index.html
    ...(isAppBuild && {
      middlewareMode: false,
    }),
  },
  plugins: [
    // Custom plugin to handle index.html serving for app vs website
    {
      name: 'app-website-router',
      configResolved(config) {
        // Store for use in other hooks
      },
      // Handle index.html requests in dev mode
      transform(code, id) {
        return code;
      },
      resolveId(id) {
        // In app build mode, redirect /index.html to /src/index.html
        if (isAppBuild && id === '/index.html') {
          return path.resolve(__dirname, 'src/index.html');
        }
      },
    },
    react(), 
    componentTagger()
  ].filter(Boolean),
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


