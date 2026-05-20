import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from "fs";

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const isAppBuild = !!process.env.VITE_APP_BUILD;

  return {
  base: process.env.GITHUB_PAGES ? '/Pulse/' : './',
  server: {
    host: "::",
    port: 8080,
    middlewareMode: false,
  },
  plugins: [
    // Serve src/index.html for app builds in dev mode
    {
      name: 'serve-app-index',
      apply: 'serve',
      configResolved(config) {
        this.config = config;
      },
      configureServer(server) {
        return () => {
          server.middlewares.use((req, res, next) => {
            // In app build mode, serve src/index.html for root requests
            if (isAppBuild && (req.url === '/' || req.url === '/index.html')) {
              const appIndexPath = path.join(process.cwd(), 'src/index.html');
              if (fs.existsSync(appIndexPath)) {
                const html = fs.readFileSync(appIndexPath, 'utf-8');
                res.setHeader('Content-Type', 'text/html');
                res.end(html);
                return;
              }
            }
            next();
          });
        };
      },
    },
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


