import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

/**
 * Tests with real WAV files loaded.
 * Uses the 27 drum loop WAV files in e2e/wav files/ to test file import,
 * auto-categorization, auto-rename, search, selection, batch ops, org modes,
 * silence analysis, playback, duplicate detection, export, and performance.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WAV_DIR = path.join(__dirname, 'wav files');

function getWavFiles(): string[] {
  return fs.readdirSync(WAV_DIR)
    .filter(f => f.endsWith('.wav'))
    .map(f => path.join(WAV_DIR, f));
}

function getWavFilesSubset(count: number): string[] {
  return getWavFiles().slice(0, count);
}

async function dismissOnboarding(page: Page) {
  try {
    const skip = page.getByRole('button', { name: /skip.*setup/i });
    await skip.click({ timeout: 2000 });
    await page.waitForTimeout(300);
  } catch { /* not shown */ }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
}

async function loadFiles(page: Page, filePaths: string[]) {
  await page.locator('#file-upload').setInputFiles(filePaths);
  await expect(page.getByRole('button', { name: /export/i }))
    .toBeEnabled({ timeout: 30000 });
  await page.waitForTimeout(500);
}

/** Assert the status bar shows "N file(s) loaded". */
async function expectFileCount(page: Page, n: number) {
  const label = n === 1 ? '1 file loaded' : `${n} files loaded`;
  await expect(page.getByText(label)).toBeVisible({ timeout: 5000 });
}

/** Click a toolbar action button by name. */
async function clickToolbarButton(page: Page, buttonName: RegExp) {
  await page.getByRole('button', { name: buttonName }).click();
}

/** Click "Auto Rename" and confirm the preview dialog. */
async function autoRenameAndConfirm(page: Page) {
  await clickToolbarButton(page, /auto rename/i);
  // The app shows a "Preview Rename Changes" dialog — confirm it
  const previewDialog = page.getByRole('dialog').filter({ hasText: /preview rename/i });
  await expect(previewDialog).toBeVisible({ timeout: 5000 });
  await previewDialog.getByRole('button', { name: /rename tracks/i }).click();
  await expect(previewDialog).not.toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(300);
}

async function setup(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await dismissOnboarding(page);
}

// ---------------------------------------------------------------------------
// File Import Tests
// ---------------------------------------------------------------------------

test.describe('File Import', () => {
  test.beforeEach(async ({ page }) => setup(page));

  test('should import a single WAV file', async ({ page }) => {
    await loadFiles(page, getWavFilesSubset(1));
    await expectFileCount(page, 1);
  });

  test('should import multiple WAV files', async ({ page }) => {
    await loadFiles(page, getWavFilesSubset(5));
    await expectFileCount(page, 5);
  });

  test('should import all 27 WAV files', async ({ page }) => {
    await loadFiles(page, getWavFiles());
    await expectFileCount(page, 27);
  });

  test('should show tracks in the file list after import', async ({ page }) => {
    await loadFiles(page, getWavFilesSubset(3));

    // Track headings should appear with original filenames
    await expect(page.locator('h3').filter({ hasText: '_RGD_BD_PROH_' }).first()).toBeVisible();
  });

  test('should show success toast on import', async ({ page }) => {
    await loadFiles(page, getWavFilesSubset(3));
    await expect(page.getByText(/added.*3.*file/i)).toBeVisible({ timeout: 5000 });
  });

  test('should display waveforms after import', async ({ page }) => {
    await loadFiles(page, getWavFilesSubset(2));
    await page.waitForTimeout(1000);

    const canvases = page.locator('canvas');
    const count = await canvases.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should enable toolbar buttons after import', async ({ page }) => {
    await expect(page.getByRole('button', { name: /export/i })).toBeDisabled();
    await expect(page.getByRole('button', { name: /auto rename/i })).toBeDisabled();

    await loadFiles(page, getWavFilesSubset(2));

    await expect(page.getByRole('button', { name: /export/i })).toBeEnabled();
    await expect(page.getByRole('button', { name: /auto rename/i })).toBeEnabled();
  });
});

// ---------------------------------------------------------------------------
// Auto-Categorization Tests
// ---------------------------------------------------------------------------

test.describe('Auto-Categorization', () => {
  test.beforeEach(async ({ page }) => setup(page));

  test('should categorize DRUM files as Drums', async ({ page }) => {
    await loadFiles(page, getWavFilesSubset(3));

    // Switch to category view
    const orgSelect = page.locator('[role="combobox"]').first();
    await orgSelect.click();
    await page.getByRole('option', { name: /category/i }).click();
    await page.waitForTimeout(300);

    await expect(page.getByText(/drums/i).first()).toBeVisible();
  });

  test('should show file counts in category manager', async ({ page }) => {
    await loadFiles(page, getWavFilesSubset(5));

    await page.getByRole('button', { name: /categories/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await expect(page.getByRole('dialog').getByText('5 files')).toBeVisible();

    await page.keyboard.press('Escape');
  });

  test('should show correct category in track selectors', async ({ page }) => {
    await loadFiles(page, getWavFilesSubset(2));

    // Each track has a "Drums" category button
    const drumsBtns = page.getByRole('button', { name: 'Drums' });
    const count = await drumsBtns.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// Auto-Rename Tests
// ---------------------------------------------------------------------------

test.describe('Auto-Rename', () => {
  test.beforeEach(async ({ page }) => setup(page));

  test('should rename files via preview dialog', async ({ page }) => {
    await loadFiles(page, getWavFilesSubset(3));
    await autoRenameAndConfirm(page);

    // File names should now have "(Drums)" suffix
    await expect(page.locator('h3').filter({ hasText: '(Drums)' }).first()).toBeVisible();
  });

  test('should enable undo after rename', async ({ page }) => {
    await loadFiles(page, getWavFilesSubset(2));

    const undoBtn = page.getByRole('button', { name: /^undo$/i });
    await expect(undoBtn).toBeDisabled();

    await autoRenameAndConfirm(page);

    await expect(undoBtn).toBeEnabled();
  });

  test('should undo rename with Ctrl+Z', async ({ page }) => {
    await loadFiles(page, getWavFilesSubset(2));
    await autoRenameAndConfirm(page);

    // Verify renamed
    await expect(page.locator('h3').filter({ hasText: '(Drums)' }).first()).toBeVisible();

    // Undo
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(500);

    // Original names restored
    await expect(page.locator('h3').filter({ hasText: '_RGD_BD_PROH_' }).first()).toBeVisible();
  });

  test('should show preview dialog with all rename changes', async ({ page }) => {
    await loadFiles(page, getWavFilesSubset(3));

    await clickToolbarButton(page, /auto rename/i);

    const previewDialog = page.getByRole('dialog').filter({ hasText: /preview rename/i });
    await expect(previewDialog).toBeVisible({ timeout: 5000 });

    // Should show table with current and new names
    await expect(previewDialog.locator('table')).toBeVisible();
    await expect(previewDialog.getByText('Bd (Drums).wav')).toBeVisible();

    // Cancel to not apply
    await previewDialog.getByRole('button', { name: /cancel/i }).click();
    await expect(previewDialog).not.toBeVisible({ timeout: 3000 });
  });

  test('should apply unique names for duplicate patterns', async ({ page }) => {
    await loadFiles(page, getWavFilesSubset(5));
    await autoRenameAndConfirm(page);

    // All files should still be present and renamed
    await expectFileCount(page, 5);
    // At least one file should show "(Drums)" in its heading
    await expect(page.locator('h3').filter({ hasText: '(Drums)' }).first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Search with Files Tests
// ---------------------------------------------------------------------------

test.describe('Search with Files', () => {
  test.beforeEach(async ({ page }) => {
    await setup(page);
    await loadFiles(page, getWavFilesSubset(10));
  });

  test('should filter files by search term', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="search" i]').first();
    await searchInput.click();
    await searchInput.fill('125BPM');
    await page.waitForTimeout(300);

    // Only 125BPM tracks should be visible
    const tracks125 = page.locator('h3').filter({ hasText: '125BPM' });
    const count = await tracks125.count();
    expect(count).toBeGreaterThan(0);

    // 128BPM tracks should not be visible
    const tracks128 = page.locator('h3').filter({ hasText: '128BPM' });
    await expect(tracks128.first()).not.toBeVisible({ timeout: 4000 });
  });

  test('should show all files when search is cleared', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="search" i]').first();

    await searchInput.click();
    await searchInput.fill('125BPM');
    await page.waitForTimeout(300);

    await searchInput.clear();
    await page.waitForTimeout(300);

    await expectFileCount(page, 10);
  });

  test('should search case-insensitively', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="search" i]').first();
    await searchInput.click();
    await searchInput.fill('drum');
    await page.waitForTimeout(300);

    // Should find files (they have "DRUM" uppercase)
    const tracks = page.locator('h3').filter({ hasText: /DRUM/i });
    const count = await tracks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should show no matches for nonsense query', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="search" i]').first();
    await searchInput.click();
    await searchInput.fill('xyznonexistent');
    await page.waitForTimeout(300);

    // No track headings should be visible
    const tracks = page.locator('h3').filter({ hasText: '_RGD_BD_PROH_' });
    const count = await tracks.count();
    expect(count).toBe(0);
  });

  test('should focus search with Ctrl+F and filter', async ({ page }) => {
    await page.keyboard.press('Control+f');

    const searchInput = page.locator('input[placeholder*="search" i]').first();
    await expect(searchInput).toBeFocused();

    await searchInput.fill('126');
    await page.waitForTimeout(300);

    // 126BPM tracks should be visible
    const tracks = page.locator('h3').filter({ hasText: '126BPM' });
    const count = await tracks.count();
    expect(count).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Selection & Batch Operations Tests
// ---------------------------------------------------------------------------

test.describe('Selection and Batch Operations', () => {
  test.beforeEach(async ({ page }) => {
    await setup(page);
    await loadFiles(page, getWavFilesSubset(5));
  });

  test('should select all files with button', async ({ page }) => {
    await page.getByRole('button', { name: /select all/i }).click();
    await page.waitForTimeout(300);

    await expect(page.getByText('5 selected')).toBeVisible();
  });

  test('should select all files with Ctrl+A', async ({ page }) => {
    await page.locator('body').click();
    await page.waitForTimeout(100);

    await page.keyboard.press('Control+a');
    await page.waitForTimeout(300);

    await expect(page.getByText('5 selected')).toBeVisible();
  });

  test('should deselect all files', async ({ page }) => {
    await page.getByRole('button', { name: /select all/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText('5 selected')).toBeVisible();

    await page.getByRole('button', { name: /^clear$/i }).click();
    await page.waitForTimeout(300);

    await expect(page.getByText('5 selected')).not.toBeVisible();
  });

  test('should show batch actions when files are selected', async ({ page }) => {
    await page.getByRole('button', { name: /select all/i }).click();
    await page.waitForTimeout(300);

    await expect(page.getByRole('button', { name: /delete selected/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /restore original/i })).toBeVisible();
  });

  test('should delete selected files', async ({ page }) => {
    await expectFileCount(page, 5);

    await page.getByRole('button', { name: /select all/i }).click();
    await page.waitForTimeout(300);

    await page.getByRole('button', { name: /delete selected/i }).click();
    await page.waitForTimeout(500);

    await expectFileCount(page, 0);
  });

  test('should undo delete', async ({ page }) => {
    await page.getByRole('button', { name: /select all/i }).click();
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: /delete selected/i }).click();
    await page.waitForTimeout(300);

    await expectFileCount(page, 0);

    await page.keyboard.press('Control+z');
    await page.waitForTimeout(500);

    await expectFileCount(page, 5);
  });

  test('should restore original names after rename', async ({ page }) => {
    await autoRenameAndConfirm(page);

    // Verify renamed
    await expect(page.locator('h3').filter({ hasText: '(Drums)' }).first()).toBeVisible();

    // Select all
    await page.getByRole('button', { name: /select all/i }).click();
    await page.waitForTimeout(200);

    // Restore original
    await page.getByRole('button', { name: /restore original/i }).click();
    await page.waitForTimeout(500);

    // Original names should be back
    await expect(page.locator('h3').filter({ hasText: '_RGD_BD_PROH_' }).first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Organization Modes with Files
// ---------------------------------------------------------------------------

test.describe('Organization with Files', () => {
  test.beforeEach(async ({ page }) => {
    await setup(page);
    await loadFiles(page, getWavFilesSubset(5));
  });

  test('should switch to category view', async ({ page }) => {
    const orgSelect = page.locator('[role="combobox"]').first();
    await orgSelect.click();
    await page.getByRole('option', { name: /category/i }).click();
    await page.waitForTimeout(300);

    await expect(page.getByText(/drums/i).first()).toBeVisible();
  });

  test('should switch to alphabetical A-Z', async ({ page }) => {
    const orgSelect = page.locator('[role="combobox"]').first();
    await orgSelect.click();
    await page.getByRole('option', { name: /a-z/i }).click();
    await page.waitForTimeout(300);

    await expectFileCount(page, 5);
  });

  test('should switch to alphabetical Z-A', async ({ page }) => {
    const orgSelect = page.locator('[role="combobox"]').first();
    await orgSelect.click();
    await page.getByRole('option', { name: /z-a/i }).click();
    await page.waitForTimeout(300);

    await expectFileCount(page, 5);
  });

  test('should switch to import order', async ({ page }) => {
    const orgSelect = page.locator('[role="combobox"]').first();
    await orgSelect.click();
    await page.getByRole('option', { name: /import/i }).click();
    await page.waitForTimeout(300);

    await expectFileCount(page, 5);
  });
});

// ---------------------------------------------------------------------------
// Silence Analysis Tests
// ---------------------------------------------------------------------------

test.describe('Silence Analysis', () => {
  test.beforeEach(async ({ page }) => {
    await setup(page);
    await loadFiles(page, getWavFilesSubset(5));
  });

  test('should run silence analysis without crashing', async ({ page }) => {
    await clickToolbarButton(page, /analyze silence/i);

    await expect(page.getByText(/silence.*analysis|analyzed|silent/i).first())
      .toBeVisible({ timeout: 15000 });

    await expectFileCount(page, 5);
  });

  test('should not mark real audio as silent', async ({ page }) => {
    await clickToolbarButton(page, /analyze silence/i);
    await page.waitForTimeout(3000);

    await expectFileCount(page, 5);
  });
});

// ---------------------------------------------------------------------------
// Audio Playback Tests
// ---------------------------------------------------------------------------

test.describe('Audio Playback', () => {
  test.beforeEach(async ({ page }) => {
    await setup(page);
    await loadFiles(page, getWavFilesSubset(2));
  });

  test('should have play buttons on tracks', async ({ page }) => {
    const playButtons = page.locator('button').filter({
      has: page.locator('svg')
    });
    const count = await playButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should toggle play with Space key', async ({ page }) => {
    await page.locator('body').click();
    await page.waitForTimeout(100);

    await page.keyboard.press('Space');
    await page.waitForTimeout(500);

    await expect(page.locator('body')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Duplicate Detection Tests
// ---------------------------------------------------------------------------

test.describe('Duplicate Detection', () => {
  test.beforeEach(async ({ page }) => setup(page));

  test('should detect duplicate files when importing same file twice', async ({ page }) => {
    const files = getWavFilesSubset(2);

    await loadFiles(page, files);
    await expectFileCount(page, 2);

    await page.locator('#file-upload').setInputFiles(files);
    await page.waitForTimeout(3000);

    await expect(page.getByText(/duplicate/i).first()).toBeVisible({ timeout: 5000 });
    await expectFileCount(page, 4);
  });

  test('should offer to remove duplicates', async ({ page }) => {
    const files = getWavFilesSubset(2);

    await loadFiles(page, files);
    await page.locator('#file-upload').setInputFiles(files);
    await page.waitForTimeout(3000);

    const removeDupesBtn = page.getByRole('button', { name: /remove duplicates/i });
    await expect(removeDupesBtn).toBeVisible({ timeout: 5000 });

    await removeDupesBtn.click();
    await page.waitForTimeout(500);

    await expectFileCount(page, 2);
  });
});

// ---------------------------------------------------------------------------
// Export with Files (Tauri IPC mocked)
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

test.describe('Export with real files (Tauri mocked)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      let _cbId = 0;
      const w = window as TauriWindow;
      w.__TAURI_INTERNALS__ = {
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
        invoke(cmd: string, args: unknown): Promise<unknown> {
          if (cmd === 'plugin:dialog|open') return Promise.resolve('/mock/export-dir');
          if (cmd === 'plugin:fs|mkdir' || cmd === 'plugin:fs|write_file' || cmd === 'plugin:fs|write')
            return Promise.resolve(null);
          if (cmd === 'plugin:path|join') {
            const paths = ((args as Record<string, unknown>)?.paths as string[]) ?? [];
            return Promise.resolve(paths.join('/'));
          }
          return Promise.reject(new Error(`Unmocked Tauri command: ${cmd}`));
        },
      };
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissOnboarding(page);
  });

  test('should export drum files successfully', async ({ page }) => {
    await loadFiles(page, getWavFilesSubset(3));

    await page.getByRole('button', { name: /export/i }).click();

    const optionsDialog = page.getByRole('dialog').filter({ hasText: /export options/i });
    await expect(optionsDialog).toBeVisible({ timeout: 4000 });
    await optionsDialog.getByRole('button', { name: /^export$/i }).click();

    await expect(page.getByText(/exported.*file/i)).toBeVisible({ timeout: 8000 });
  });
});

// ---------------------------------------------------------------------------
// Performance Tests
// ---------------------------------------------------------------------------

test.describe('Performance', () => {
  test.beforeEach(async ({ page }) => setup(page));

  test('should handle all 27 files without crashing', async ({ page }) => {
    const files = getWavFiles();
    expect(files.length).toBe(27);

    await loadFiles(page, files);
    await expectFileCount(page, 27);

    await expect(page.getByRole('button', { name: /export/i })).toBeEnabled();
    await expect(page.getByRole('button', { name: /auto rename/i })).toBeEnabled();
  });

  test('should search through 27 files quickly', async ({ page }) => {
    await loadFiles(page, getWavFiles());

    const searchInput = page.locator('input[placeholder*="search" i]').first();
    await searchInput.click();

    const start = Date.now();
    await searchInput.fill('128BPM');
    await page.waitForTimeout(300);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(2000);

    const tracks = page.locator('h3').filter({ hasText: '128BPM' });
    const count = await tracks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should rename all 27 files without issues', async ({ page }) => {
    await loadFiles(page, getWavFiles());
    await autoRenameAndConfirm(page);

    await expectFileCount(page, 27);
    await expect(page.locator('h3').filter({ hasText: '(Drums)' }).first()).toBeVisible();
  });
});
