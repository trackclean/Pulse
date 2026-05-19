import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

/**
 * Targeted automation for TESTING_GUIDE.md edge cases using generated WAV assets.
 * This complements existing e2e specs by covering special filenames, silence,
 * long stems, large files, and 100+ batch imports.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUDIO_DIR = path.join(__dirname, 'test-audio');
const BATCH_DIR = path.join(AUDIO_DIR, 'batch-110');

const audioPath = (name: string) => path.join(AUDIO_DIR, name);

const getBatchFiles = () =>
  fs.readdirSync(BATCH_DIR)
    .filter((f) => f.endsWith('.wav'))
    .map((f) => path.join(BATCH_DIR, f));

async function dismissOnboarding(page: Page) {
  try {
    const skip = page.getByRole('button', { name: /skip.*setup/i });
    await skip.click({ timeout: 2000 });
    await page.waitForTimeout(300);
  } catch {
    // not shown
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
}

async function setup(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await dismissOnboarding(page);
}

async function loadFiles(page: Page, filePaths: string[], timeoutMs = 60000) {
  await page.locator('#file-upload').setInputFiles(filePaths);
  await expect(page.getByRole('button', { name: /export/i }))
    .toBeEnabled({ timeout: timeoutMs });
  await page.waitForTimeout(500);
}

async function expectFileCount(page: Page, n: number, timeoutMs = 10000) {
  const label = n === 1 ? '1 file loaded' : `${n} files loaded`;
  await expect(page.getByText(label)).toBeVisible({ timeout: timeoutMs });
}

test.describe('Testing Guide Edge Cases (Generated WAV Assets)', () => {
  test.beforeEach(async ({ page }) => setup(page));

  test('imports special-character and Unicode filenames', async ({ page }) => {
    await loadFiles(page, [
      audioPath('Test!@#$%.wav'),
      audioPath('日本語テスト.wav'),
      audioPath('æ—¥æœ¬èªžãƒ†ã‚¹ãƒˆ.wav'),
    ]);

    await expect(page.locator('h3').filter({ hasText: 'Test!@#$%' }).first()).toBeVisible();
    await expect(page.locator('h3').filter({ hasText: '日本語テスト' }).first()).toBeVisible();
    await expect(page.locator('h3').filter({ hasText: 'æ—¥æœ¬èªžãƒ†ã‚¹ãƒˆ' }).first()).toBeVisible();
  });

  test('imports supported non-WAV formats', async ({ page }) => {
    await loadFiles(page, [
      audioPath('sample1_mp3.mp3'),
      audioPath('sample1_ogg.ogg'),
      audioPath('sample1_flac.flac'),
      audioPath('sample1_m4a.m4a'),
      audioPath('sample1_aac.aac'),
      audioPath('sample1_wma.wma'),
    ]);

    await expectFileCount(page, 6, 20000);

    // Loading cards should resolve for supported formats
    await expect(page.getByText(/loading sample1_/i)).toHaveCount(0, { timeout: 20000 });
  });

  test('rejects non-audio files (.txt/.jpg)', async ({ page }) => {
    await page.locator('#file-upload').setInputFiles([
      audioPath('not_audio.txt'),
      audioPath('not_audio.jpg'),
    ]);

    await expect(page.getByRole('button', { name: /export/i })).toBeDisabled();
  });

  test('silence analysis marks silent files', async ({ page }) => {
    await loadFiles(page, [
      audioPath('silent_5s.wav'),
      audioPath('known_bpm_120.wav'),
    ]);

    await page.getByRole('button', { name: /analyze silence/i }).click();
    await expect(page.getByText(/silence.*analysis|analyzed|silent/i).first())
      .toBeVisible({ timeout: 20000 });

    await expect(page.getByText('Silent').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /delete silent/i })).toBeVisible();
  });

  test('classifies 3+ long files as stems (BPM skipped)', async ({ page }) => {
    test.setTimeout(120000);
    await loadFiles(page, [
      audioPath('long_stem_A_150s.wav'),
      audioPath('long_stem_B_150s.wav'),
      audioPath('long_stem_C_150s.wav'),
    ], 90000);

    const stemBadges = page.getByText(/^Stem$/);
    const count = await stemBadges.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('detects duplicates for identical files with different names', async ({ page }) => {
    await loadFiles(page, [
      audioPath('duplicate_source.wav'),
      audioPath('duplicate_copy.wav'),
    ]);

    await expect(page.getByText(/duplicate/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /remove duplicates/i })).toBeVisible();
  });

  test('auto-categorizes based on filename keywords', async ({ page }) => {
    await loadFiles(page, [
      audioPath('bass_sub_01.wav'),
      audioPath('synth_pad_01.wav'),
      audioPath('vocal_phrase_01.wav'),
      audioPath('fx_riser_01.wav'),
      audioPath('perc_shaker_01.wav'),
    ]);

    await expect(page.getByRole('button', { name: 'Bass' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Synths' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Vox' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'FX' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Drums' }).first()).toBeVisible();
  });

  test('imports 110 files without crashing', async ({ page }) => {
    test.setTimeout(120000);
    const batchFiles = getBatchFiles();
    expect(batchFiles.length).toBe(110);

    await loadFiles(page, batchFiles, 90000);
    await expectFileCount(page, 110, 20000);
  });

  test('imports very short file (<1s)', async ({ page }) => {
    await loadFiles(page, [audioPath('very_short_0_5s.wav')]);
    await expectFileCount(page, 1);
  });

  test('imports large 100MB+ file', async ({ page }) => {
    test.setTimeout(180000);
    await loadFiles(page, [audioPath('large_100mb.wav')], 150000);
    await expectFileCount(page, 1, 20000);
  });

  test('imports large 500MB+ file', async ({ page }) => {
    test.setTimeout(240000);
    await loadFiles(page, [audioPath('large_500mb.wav')], 200000);
    await expectFileCount(page, 1, 20000);
  });
});
