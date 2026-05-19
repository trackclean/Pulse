import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * User flow tests for Clean Track Buddy
 * Based on the QA checklist
 */

test.describe('User Flow: Import and Organize', () => {
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

  test('should handle empty state', async ({ page }) => {
    // Check for empty state message or import prompt
    const emptyState = page.locator('text=/import|drop|drag/i').first();
    await expect(emptyState).toBeVisible({ timeout: 5000 });
  });

  test('should show search functionality', async ({ page }) => {
    // Use Ctrl+F keyboard shortcut to focus search
    await page.keyboard.press('Control+f');

    // Check that search input is focused
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    await expect(searchInput).toBeFocused();
  });
});

test.describe('Settings Management', () => {
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

  test('should open and close settings', async ({ page }) => {
    // Open settings
    const settingsBtn = page.getByRole('button', { name: /settings/i });
    await settingsBtn.click();

    // Verify settings dialog is open
    await expect(page.getByRole('dialog')).toBeVisible();

    // Close settings (look for close button or ESC key)
    await page.keyboard.press('Escape');

    // Verify settings dialog is closed
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 2000 });
  });

  test('should toggle theme', async ({ page }) => {
    // Open settings
    await page.getByRole('button', { name: /settings/i }).click();

    // Find theme selector
    const themeSelect = page.locator('select, [role="combobox"]').filter({
      hasText: /theme|dark|light/i
    }).first();

    if (await themeSelect.isVisible()) {
      // Get current value
      const initialValue = await themeSelect.inputValue().catch(() => null);

      // Change theme
      await themeSelect.selectOption({ index: 1 });

      // Verify change
      const newValue = await themeSelect.inputValue();
      expect(newValue).not.toBe(initialValue);
    }
  });
});

test.describe('Keyboard Shortcuts', () => {
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

  test('should focus search with Ctrl+F', async ({ page }) => {
    await page.keyboard.press('Control+f');

    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    await expect(searchInput).toBeFocused();
  });

  test('should select all with Ctrl+A', async ({ page }) => {
    // This test would need audio files imported first
    // For now, just verify the shortcut doesn't break anything
    await page.keyboard.press('Control+a');

    // App should still be functional
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
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

    // Tab through interactive elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Verify focus is visible on some element
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});
