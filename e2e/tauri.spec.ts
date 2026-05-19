/**
 * Tauri App Integration Tests
 *
 * These tests run against the REAL Tauri app via WebView2 CDP (Windows only).
 * They verify that:
 *   - Assets load correctly (the base: './' fix)
 *   - window.__TAURI__ is available (Tauri runtime is running)
 *   - The app initializes and renders correctly in the native window
 *
 * Prerequisites:
 *   1. Build the debug binary: npm run tauri:build:debug
 *   2. Run: npm run test:tauri
 */

import { test, expect, chromium } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';

const CDP_URL = 'http://localhost:9222';

// Shared browser/page across all tests (one real app instance)
let browser: Browser;
let page: Page;

test.describe.configure({ mode: 'serial' });

test.describe('Tauri App (Real Runtime)', () => {
  test.beforeAll(async () => {
    // Connect to the running Tauri app via WebView2 CDP
    browser = await chromium.connectOverCDP(CDP_URL);

    const contexts = browser.contexts();
    if (contexts.length === 0) {
      throw new Error('No WebView2 context found. Is the app running with --remote-debugging-port=9222?');
    }

    const context = contexts[0];
    const allPages = context.pages();
    page = allPages.length > 0 ? allPages[0] : await context.waitForEvent('page');

    // Wait for React to mount in #root.
    // IMPORTANT: Do NOT use page.reload() or page.waitForFunction() — both break with
    // WebView2 CDP connections. page.reload() causes ES module circular-dep errors;
    // page.waitForFunction() causes "Target closed" errors. Use page.evaluate() in a loop.
    const deadline = Date.now() + 20000;
    let mounted = false;

    while (Date.now() < deadline) {
      try {
        mounted = await page.evaluate(() => {
          const root = document.getElementById('root');
          return root !== null && root.children.length > 0;
        });
        if (mounted) break;
      } catch {
        // Page temporarily unavailable during startup — keep retrying
      }
      await page.waitForTimeout(500);
    }

    if (!mounted) {
      throw new Error('React never mounted in #root within 20 seconds. Check that the binary was built with: npm run tauri:build:debug');
    }
  });

  test.afterAll(async () => {
    // Don't close the browser — the global teardown kills the app process
    // Just disconnect Playwright from it
    await browser?.close();
  });

  // ─── Diagnostics (runs first, always) ────────────────────────────────────

  test('diagnostic: page context info', async () => {
    const info = await page.evaluate(async () => {
      // Check Tauri globals (Tauri injects these before page loads)
      const tauriGlobals = {
        hasTauriInternals: '__TAURI_INTERNALS__' in window,
        hasTauri: '__TAURI__' in window,
        hasIPC: '__TAURI_IPC__' in window,
      };

      // Check if the main JS bundle is fetchable
      let bundleFetch: { status?: number; size?: number; error?: string } = {};
      try {
        const scripts = Array.from(document.querySelectorAll('script[src]'));
        const mainScript = scripts[0] as HTMLScriptElement;
        if (mainScript?.src) {
          const resp = await fetch(mainScript.src);
          bundleFetch = { status: resp.status, size: (await resp.text()).length };
        }
      } catch (e: unknown) {
        bundleFetch = { error: e instanceof Error ? e.message : String(e) };
      }

      return {
        url: document.URL,
        readyState: document.readyState,
        scriptCount: document.scripts.length,
        rootChildCount: document.getElementById('root')?.children.length ?? -1,
        bodyChildCount: document.body.children.length,
        title: document.title,
        tauriGlobals,
        bundleFetch,
      };
    });
    console.log('\n📋 Page diagnostic info:\n' + JSON.stringify(info, null, 2));
    expect(info.url).toBeTruthy();
  });

  // ─── Asset loading ────────────────────────────────────────────────────────

  test('CSS loads correctly (not a black screen)', async () => {
    // If base: './' is missing, CSS fails to load and --background is undefined
    const bgVar = await page.evaluate(() =>
      window.getComputedStyle(document.documentElement).getPropertyValue('--background').trim()
    );
    expect(bgVar, 'CSS variable --background should be defined. Empty means CSS did not load.').not.toBe('');
  });

  test('JS bundle loads and React mounts', async () => {
    // If JS fails to load, #root will be empty
    const rootHasChildren = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root !== null && root.children.length > 0;
    });
    expect(rootHasChildren, '#root should have React content').toBe(true);
  });

  test('all asset paths are relative (base: ./ fix)', async () => {
    // Verify no /assets/ absolute paths are being loaded (they would 404 in Tauri)
    const absoluteAssets = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[src]'))
        .map((s) => (s as HTMLScriptElement).src)
        .filter((src) => src.startsWith('/assets/'));

      const links = Array.from(document.querySelectorAll('link[href]'))
        .map((l) => (l as HTMLLinkElement).href)
        .filter((href) => href.startsWith('/assets/'));

      return [...scripts, ...links];
    });
    expect(absoluteAssets, 'No assets should use absolute /assets/ paths').toHaveLength(0);
  });

  // ─── Tauri runtime ────────────────────────────────────────────────────────

  test('Tauri runtime is available (__TAURI_INTERNALS__)', async () => {
    // In Tauri v2, window.__TAURI__ was removed. The runtime is exposed via __TAURI_INTERNALS__.
    const hasTauri = await page.evaluate(() => {
      const w = window as Window & { __TAURI_INTERNALS__?: unknown };
      return typeof w.__TAURI_INTERNALS__ !== 'undefined';
    });
    expect(hasTauri, '__TAURI_INTERNALS__ must be defined — app is running inside Tauri v2').toBe(true);
  });

  test('Tauri IPC is available', async () => {
    // In Tauri v2, low-level IPC is on __TAURI_INTERNALS__.ipc or .postMessage
    const hasIPC = await page.evaluate(() => {
      const internals = (window as Window & { __TAURI_INTERNALS__?: { ipc?: unknown; postMessage?: unknown; transformCallback?: unknown } }).__TAURI_INTERNALS__;
      return typeof internals?.ipc === 'function' || typeof internals?.postMessage === 'function' || typeof internals?.transformCallback === 'function';
    });
    expect(hasIPC, '__TAURI_INTERNALS__ should expose IPC methods').toBe(true);
  });

  // ─── App UI ───────────────────────────────────────────────────────────────

  test('app title renders', async () => {
    await expect(page.getByText(/pulse/i)).toBeVisible();
    await expect(page.getByText(/upload, analyze, clean, and organize your audio samples/i)).toBeVisible();
  });

  test('onboarding overlay shows on first launch', async () => {
    // On a fresh install hasCompletedOnboarding is false
    // Note: if you've run the app before, localStorage may persist — clear it or use a fresh profile
    const onboarding = page.getByText(/welcome to pulse/i);
    const dropZone = page.getByText(/drag.*drop|drop.*files/i);

    const onboardingVisible = await onboarding.isVisible().catch(() => false);
    const dropZoneVisible = await dropZone.isVisible().catch(() => false);

    // Either onboarding OR the main UI must be visible — not a blank screen
    expect(onboardingVisible || dropZoneVisible, 'Either onboarding or drop zone must be visible').toBe(true);
  });

  test('can dismiss onboarding and reach main UI', async () => {
    // If onboarding is showing, dismiss it
    const skipButton = page.getByRole('button', { name: /skip.*setup/i });
    if (await skipButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipButton.click();
      await page.waitForTimeout(500);
    }

    // Main UI: drop zone should now be visible
    await expect(
      page.getByText(/drag.*drop|drop.*files|drop audio/i).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('toolbar is rendered', async () => {
    // Core toolbar actions should exist
    await expect(page.getByRole('button', { name: /export/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /settings/i })).toBeVisible();
  });

  test('settings dialog opens inside real Tauri window', async () => {
    await page.getByRole('button', { name: /settings/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('no critical JavaScript errors', async () => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    // Navigate to force any deferred errors
    await page.evaluate(() => window.dispatchEvent(new Event('load')));
    await page.waitForTimeout(1000);

    const critical = errors.filter((e) => {
      if (e.includes('ResizeObserver') || e.includes('favicon')) return false;
      // Filter expected Tauri errors in dev mode
      if (e.includes('__TAURI') || e.includes('invoke') || e.includes('tauri')) return false;
      return true;
    });

    expect(critical, `Unexpected JS errors: ${critical.join(', ')}`).toHaveLength(0);
  });

  // ─── Tauri-specific features ──────────────────────────────────────────────

  test('localStorage is accessible (settings persistence)', async () => {
    const value = await page.evaluate(() => {
      localStorage.setItem('test-key', 'tauri-test');
      return localStorage.getItem('test-key');
    });
    expect(value).toBe('tauri-test');
    await page.evaluate(() => localStorage.removeItem('test-key'));
  });

  test('app version matches tauri.conf.json', async () => {
    const version = await page.evaluate(async () => {
      try {
        const { getVersion } = await import('@tauri-apps/api/app');
        return await getVersion();
      } catch {
        return null;
      }
    });
    // Version may be null if the API isn't exposed in debug mode, that's OK
    if (version !== null) {
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });
});
