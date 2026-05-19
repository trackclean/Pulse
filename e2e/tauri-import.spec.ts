import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUDIO_DIR = path.join(__dirname, 'test-audio');
const CDP_URL = 'http://localhost:9222';

let browser: Awaited<ReturnType<typeof chromium.connectOverCDP>>;
let page: import('@playwright/test').Page;

test.describe.configure({ mode: 'serial' });

async function waitForReactMount(p: typeof page) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    try {
      const mounted = await p.evaluate(() => {
        const root = document.getElementById('root');
        return root !== null && root.children.length > 0;
      });
      if (mounted) return;
    } catch {
      // retry during startup
    }
    await p.waitForTimeout(500);
  }
  throw new Error('React did not mount within 20 seconds.');
}

async function dismissOnboarding(p: typeof page) {
  try {
    const skip = p.getByRole('button', { name: /skip.*setup/i });
    await skip.click({ timeout: 2000 });
    await p.waitForTimeout(300);
  } catch {
    // not shown
  }
  await p.keyboard.press('Escape');
  await p.waitForTimeout(150);
}

async function loadFiles(p: typeof page, files: string[], timeoutMs = 60000) {
  await p.locator('#file-upload').setInputFiles(files);
  await expect(p.getByRole('button', { name: /export/i }))
    .toBeEnabled({ timeout: timeoutMs });
  await p.waitForTimeout(500);
}

async function expectNoLoading(p: typeof page, name: string, timeoutMs = 60000) {
  await expect(p.getByText(new RegExp(`loading\\s+${name}`, 'i')))
    .toHaveCount(0, { timeout: timeoutMs });
}

test.beforeAll(async () => {
  browser = await chromium.connectOverCDP(CDP_URL);
  const contexts = browser.contexts();
  if (contexts.length === 0) {
    throw new Error('No WebView2 context found. Is the app running with --remote-debugging-port=9222?');
  }
  const context = contexts[0];
  const pages = context.pages();
  page = pages.length > 0 ? pages[0] : await context.waitForEvent('page');
  await waitForReactMount(page);
  await dismissOnboarding(page);
});

test.afterAll(async () => {
  await browser?.close();
});

test('Tauri import: non-WAV formats finish processing', async () => {
  const files = [
    'sample1_mp3.mp3',
    'sample1_ogg.ogg',
    'sample1_flac.flac',
    'sample1_m4a.m4a',
    'sample1_aac.aac',
    'sample1_wma.wma',
  ].map((f) => path.join(AUDIO_DIR, f));

  await loadFiles(page, files, 120000);

  await expectNoLoading(page, 'sample1_mp3');
  await expectNoLoading(page, 'sample1_ogg');
  await expectNoLoading(page, 'sample1_flac');
  await expectNoLoading(page, 'sample1_m4a');
  await expectNoLoading(page, 'sample1_aac');
  await expectNoLoading(page, 'sample1_wma');
});
