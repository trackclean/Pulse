import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BINARY_PATH = path.resolve(
  __dirname,
  '../src-tauri/target/debug/clean-track-buddy.exe'
);
const CDP_PORT = 9222;
const APP_STARTUP_MS = 5000;

let tauriProcess: ChildProcess | null = null;

export default async function globalSetup(): Promise<() => Promise<void>> {
  // Check the binary exists
  if (!fs.existsSync(BINARY_PATH)) {
    throw new Error(
      `\n\nTauri debug binary not found at:\n  ${BINARY_PATH}\n\n` +
      `Build it first with:\n  npm run tauri:build:debug\n` +
      `(This takes ~5 minutes on first build)\n`
    );
  }

  console.log('\n🚀 Launching Tauri app with WebView2 CDP debugging...');
  console.log(`   Binary: ${BINARY_PATH}`);
  console.log(`   CDP port: ${CDP_PORT}\n`);

  // Launch the Tauri app with WebView2 remote debugging enabled
  tauriProcess = spawn(BINARY_PATH, [], {
    env: {
      ...process.env,
      // Tells WebView2 to start Chromium with remote debugging on this port
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${CDP_PORT}`,
    },
    stdio: 'ignore',
    detached: false,
  });

  tauriProcess.on('error', (err) => {
    console.error('Failed to start Tauri process:', err);
  });

  // Wait for the app to initialize and WebView2 to start accepting CDP connections
  console.log(`   Waiting ${APP_STARTUP_MS / 1000}s for app startup...`);
  await new Promise((resolve) => setTimeout(resolve, APP_STARTUP_MS));

  // Verify CDP endpoint is reachable
  let cdpReady = false;
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const response = await fetch(`http://localhost:${CDP_PORT}/json/version`);
      if (response.ok) {
        cdpReady = true;
        break;
      }
    } catch {
      // Not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  if (!cdpReady) {
    tauriProcess.kill();
    throw new Error(
      `WebView2 CDP endpoint not available at http://localhost:${CDP_PORT}\n` +
      `The app may have failed to start. Check that the binary works by running it manually.`
    );
  }

  console.log(`✅ Tauri app is running, CDP available at http://localhost:${CDP_PORT}\n`);

  // Return cleanup function (used as global teardown)
  return async () => {
    console.log('\n🛑 Stopping Tauri app...');
    if (tauriProcess && !tauriProcess.killed) {
      tauriProcess.kill();
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  };
}
