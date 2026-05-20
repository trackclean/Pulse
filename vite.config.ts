import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
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
      // For app builds, serve src/index.html instead of root index.html
      isAppBuild && command === 'serve' && {
        name: 'app-index-redirect',
        apply: 'serve',
        configureServer(server) {
          return () => {
            server.middlewares.use('/', (req, res, next) => {
              // Only redirect the root and /index.html requests
              if ((req.url === '/' || req.url === '/index.html') && req.method === 'GET') {
                // Rewrite to point to src/index.html
                req.url = '/src/index.html';
              }
              next();
            });
          };
        },
      },
      // For app builds, flatten output so index.html is at dist/index.html not dist/src/index.html
      isAppBuild && command === 'build' && {
        name: 'flatten-app-build',
        closeBundle: async () => {
          const srcPath = path.join(__dirname, 'dist', 'src', 'index.html');
          const destPath = path.join(__dirname, 'dist', 'index.html');
          
          // If dist/src/index.html exists, move it to dist/index.html
          if (fs.existsSync(srcPath)) {
            fs.copyFileSync(srcPath, destPath);
            // Remove the src directory if it's empty
            try {
              fs.rmSync(path.join(__dirname, 'dist', 'src'), { recursive: true, force: true });
            } catch (e) {
              // Ignore errors
            }
          }
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
        input: isAppBuild ? { index: 'src/index.html' } : 'index.html',
      },
      target: process.env.TAURI_PLATFORM == 'windows' ? 'chrome105' : 'safari13',
      minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
      sourcemap: !!process.env.TAURI_DEBUG,
    },
  };
});


