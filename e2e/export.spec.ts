import { test, expect, Page } from '@playwright/test';

/**
 * Export functionality tests for Pulse.
 *
 * Two flavours:
 *  - "without Tauri mock"  — pure UI logic, no native dialogs needed
 *  - "with Tauri mock"     — __TAURI_INTERNALS__ stubbed so the full
 *                            zip/folder write path can run in a browser
 *
 * NOTE: In Tauri v2, @tauri-apps/api/core `invoke()` calls
 *       window.__TAURI_INTERNALS__.invoke() directly (not postMessage).
 *       The mock must implement `invoke`, not `postMessage`.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type TauriInvoke = (cmd: string, args: unknown, options?: unknown) => Promise<unknown>;
type TauriInternals = {
  transformCallback: (cb: (...a: unknown[]) => unknown, once: boolean) => number;
  unregisterCallback: (id: number) => void;
  invoke: TauriInvoke;
  ipc?: unknown;
  postMessage?: unknown;
};
type TauriWindow = Window & Record<string, unknown> & { __TAURI_INTERNALS__?: TauriInternals };

/** Minimal valid 8-bit mono WAV (44-byte header + 1000 silence samples). */
function makeSilentWav(sampleCount = 1000): Buffer {
  const buf = Buffer.alloc(44 + sampleCount);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + sampleCount, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);     // fmt chunk size
  buf.writeUInt16LE(1, 20);      // PCM
  buf.writeUInt16LE(1, 22);      // mono
  buf.writeUInt32LE(44100, 24);  // sample rate
  buf.writeUInt32LE(44100, 28);  // byte rate
  buf.writeUInt16LE(1, 32);      // block align
  buf.writeUInt16LE(8, 34);      // bits per sample
  buf.write('data', 36);
  buf.writeUInt32LE(sampleCount, 40);
  buf.fill(128, 44);             // 8-bit silence midpoint
  return buf;
}

const WAV_BUFFER = makeSilentWav();

/** Dismiss the onboarding overlay if present. */
async function dismissOnboarding(page: Page) {
  try {
    const skip = page.getByRole('button', { name: /skip.*setup/i });
    await skip.click({ timeout: 2000 });
    await page.waitForTimeout(300);
  } catch { /* not shown */ }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
}

/**
 * Load a single WAV file into the app via the hidden file input.
 * Waits until the export button becomes enabled (file processed).
 */
async function loadOneFile(page: Page, name = 'kick_test.wav') {
  await page.locator('#file-upload').setInputFiles({
    name,
    mimeType: 'audio/wav',
    buffer: WAV_BUFFER,
  });
  // Wait for export button to become enabled — file is in state
  await expect(page.getByRole('button', { name: /export/i }))
    .toBeEnabled({ timeout: 10000 });
  await page.waitForTimeout(200);
}

/** Standard page setup used by most test groups. */
async function setup(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await dismissOnboarding(page);
}

/**
 * Click through the Export Options dialog that now appears after clicking Export.
 * The dialog role is "dialog" (not "alertdialog"). Clicks the "Export" confirm button.
 */
async function confirmExportOptions(page: Page) {
  const optionsDialog = page.getByRole('dialog').filter({ hasText: /export options/i });
  await expect(optionsDialog).toBeVisible({ timeout: 4000 });
  await optionsDialog.getByRole('button', { name: /^export$/i }).click();
  await expect(optionsDialog).not.toBeVisible({ timeout: 3000 });
}

/**
 * Install the Tauri IPC mock via addInitScript (runs before page JS).
 *
 * In Tauri v2, ALL plugin calls go through:
 *   window.__TAURI_INTERNALS__.invoke(cmd, args, options?) → Promise
 *
 * Command → behaviour:
 *   plugin:dialog|open     → '/mock/export-dir'
 *   plugin:fs|mkdir        → null (success)
 *   plugin:fs|write_file   → null (success)
 *   plugin:path|join       → args.paths joined with '/'
 *   everything else        → rejected (caught by app try/catch)
 */
async function installTauriMock(page: Page) {
  await page.addInitScript(() => {
    let _cbId = 0;
    const w = window as TauriWindow;
    w.__TAURI_INTERNALS__ = {
      // transformCallback is used internally by Channel and other Tauri internals
      transformCallback(cb: (...a: unknown[]) => unknown, once: boolean) {
        const id = ++_cbId;
        const key = `_${id}`;
        if (once) {
          w[key] = (...args: unknown[]) => {
            delete w[key];
            cb(...args);
          };
        } else {
          w[key] = cb;
        }
        return id;
      },
      unregisterCallback(id: number) {
        delete w[`_${id}`];
      },
      // All @tauri-apps plugin calls route through invoke() in Tauri v2
      invoke(cmd: string, args: unknown, _options?: unknown): Promise<unknown> {
        if (cmd === 'plugin:dialog|open') {
          return Promise.resolve('/mock/export-dir');
        }
        if (
          cmd === 'plugin:fs|mkdir' ||
          cmd === 'plugin:fs|write_file' ||
          cmd === 'plugin:fs|write'
        ) {
          return Promise.resolve(null);
        }
        if (cmd === 'plugin:path|join') {
          const paths = ((args as Record<string, unknown>)?.paths as string[]) ?? [];
          return Promise.resolve(paths.join('/'));
        }
        // All other commands (updater check, etc.) fail silently — app handles errors
        return Promise.reject(new Error(`Unmocked Tauri command: ${cmd}`));
      },
    };
  });
}

// ---------------------------------------------------------------------------
// Suites
// ---------------------------------------------------------------------------

test.describe('Export — button states', () => {
  test.beforeEach(async ({ page }) => setup(page));

  test('Export button is visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: /export/i })).toBeVisible();
  });

  test('Export button is disabled when no files are loaded', async ({ page }) => {
    await expect(page.getByRole('button', { name: /export/i })).toBeDisabled();
  });

  test('Export button becomes enabled after a file is loaded', async ({ page }) => {
    await loadOneFile(page, 'snare_loop.wav');
    await expect(page.getByRole('button', { name: /export/i })).toBeEnabled();
  });
});

test.describe('Export — Other-category confirmation dialog', () => {
  test.beforeEach(async ({ page }) => setup(page));

  test('shows confirmation when all files have "Other" category', async ({ page }) => {
    // Generic name that won't match any rename rule → "Other" category
    await loadOneFile(page, 'mystery_sound_xkz.wav');

    await page.getByRole('button', { name: /export/i }).click();
    await confirmExportOptions(page);

    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible({ timeout: 4000 });
    await expect(dialog).toContainText(/other/i);
  });

  test('cancelling the dialog closes it without exporting', async ({ page }) => {
    await loadOneFile(page, 'mystery_sound_xkz.wav');
    await page.getByRole('button', { name: /export/i }).click();
    await confirmExportOptions(page);

    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible({ timeout: 4000 });

    await dialog.getByRole('button', { name: /cancel/i }).click();

    await expect(dialog).not.toBeVisible({ timeout: 3000 });
    await expect(page.getByText(/exported/i)).not.toBeVisible();
  });

  test('confirming the dialog calls performExport', async ({ page }) => {
    await loadOneFile(page, 'mystery_sound_xkz.wav');
    await page.getByRole('button', { name: /export/i }).click();
    await confirmExportOptions(page);

    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible({ timeout: 4000 });

    // Actual button text from Index.tsx: "Yes, Export All"
    await dialog.getByRole('button', { name: /yes.*export.*all/i }).click();

    // Dialog closes, export attempt begins (will fail gracefully without Tauri)
    await expect(dialog).not.toBeVisible({ timeout: 3000 });
  });
});

test.describe('Export — full flow (Tauri IPC mocked)', () => {
  test.beforeEach(async ({ page }) => {
    await installTauriMock(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissOnboarding(page);
  });

  test('folder export succeeds and shows success toast', async ({ page }) => {
    // "kick_hard.wav" matches the Kick rename rule → no Other-category dialog
    await loadOneFile(page, 'kick_hard.wav');
    await page.getByRole('button', { name: /export/i }).click();
    await confirmExportOptions(page);

    // Mocked dialog returns path immediately → export proceeds → success toast
    await expect(page.getByText(/exported.*file/i)).toBeVisible({ timeout: 8000 });
  });

  test('export with Other-category: confirm then succeeds', async ({ page }) => {
    await loadOneFile(page, 'mystery_sound_xkz.wav');
    await page.getByRole('button', { name: /export/i }).click();
    await confirmExportOptions(page);

    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible({ timeout: 4000 });
    await dialog.getByRole('button', { name: /yes.*export.*all/i }).click();

    await expect(page.getByText(/exported.*file/i)).toBeVisible({ timeout: 8000 });
  });

  test('cancelling the folder picker does not show an error', async ({ page }) => {
    // Override: dialog returns null (user pressed Cancel in OS picker)
    await page.evaluate(() => {
      const w = window as TauriWindow;
      const internals = w.__TAURI_INTERNALS__;
      if (!internals) return;
      const orig = internals.invoke.bind(internals);
      internals.invoke = (
        cmd: string, args: unknown, options?: unknown
      ): Promise<unknown> => {
        if (cmd === 'plugin:dialog|open') {
          return Promise.resolve(null);
        }
        return orig(cmd, args, options);
      };
    });

    await loadOneFile(page, 'kick_hard.wav');
    await page.getByRole('button', { name: /export/i }).click();
    await confirmExportOptions(page);

    await page.waitForTimeout(1500);
    await expect(page.getByText(/failed to export/i)).not.toBeVisible();
    await expect(page.getByText(/exported.*file/i)).not.toBeVisible();
  });
});
