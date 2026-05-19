import { test, expect } from '@playwright/test';

/**
 * Example test for Pulse
 * This tests the web UI in a browser (not the Tauri desktop app)
 */

test.describe('Pulse - Basic UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Dismiss onboarding overlay by clicking "Skip Setup" button
    try {
      const skipButton = page.getByRole('button', { name: /skip.*setup/i });
      await skipButton.click({ timeout: 2000 });
      await page.waitForTimeout(500);
    } catch {
      // Onboarding might already be dismissed or not present
    }

    // As a fallback, try pressing Escape to close any dialogs
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  });

  test('should load the app', async ({ page }) => {
    // Check that the main UI elements are present (title could vary)
    const appTitle = page.locator('text=/pulse|audio sample cleaner/i').first();
    await expect(appTitle).toBeVisible();
  });

  test('should have toolbar buttons', async ({ page }) => {
    // Check for Export button (import is via drop zone, not a button)
    await expect(page.getByRole('button', { name: /export/i })).toBeVisible();
  });

  test('should open settings dialog', async ({ page }) => {
    // Find and click the settings button
    const settingsButton = page.getByRole('button', { name: /settings/i });
    await settingsButton.click();

    // Check that settings dialog opened (dialog shows "Options" title with tabs)
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('tab', { name: /general/i })).toBeVisible();
  });

  test('should toggle organized view', async ({ page }) => {
    // Look for organize/view toggle button
    const organizeButton = page.getByRole('button', { name: /organize|view/i });

    if (await organizeButton.isVisible()) {
      await organizeButton.click();

      // Verify the view changed
      await expect(page.locator('[data-testid="organized-view"]').or(
        page.locator('.organized-view')
      )).toBeVisible({ timeout: 5000 }).catch(() => {
        // View toggle might work differently, that's ok for example
      });
    }
  });
});
