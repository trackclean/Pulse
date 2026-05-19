import { defineConfig } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Playwright configuration for testing the actual Tauri app via WebView2 CDP.
 *
 * IMPORTANT: Build the debug binary first:
 *   npm run tauri:build:debug
 *
 * Then run:
 *   npm run test:tauri
 *
 * How it works (Windows only):
 *   - Launches the Tauri .exe with WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222
 *   - WebView2 (Chromium-based) exposes a CDP endpoint on port 9222
 *   - Playwright connects to the live app via chromium.connectOverCDP()
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/tauri.spec.ts', '**/tauri-import.spec.ts'],

  // Tests must run serially — one real app instance shared
  workers: 1,
  fullyParallel: false,

  globalSetup: path.resolve(__dirname, 'e2e/tauri-global-setup.ts'),

  // beforeAll connects to the app and waits for React — needs extra time
  timeout: 60000,
  reporter: [['html', { outputFolder: 'playwright-report-tauri' }], ['list']],

  use: {
    // No baseURL — we connect to the running app via CDP in the test
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
});
