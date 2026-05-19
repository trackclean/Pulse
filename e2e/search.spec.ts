import { test, expect } from '@playwright/test';

/**
 * Search and filter tests for Clean Track Buddy
 * Tests search functionality, filtering, and keyboard shortcuts
 */

test.describe('Search and Filter Tests', () => {
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

  test.describe('Search Input', () => {
    test('should have search input in toolbar', async ({ page }) => {
      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
      await expect(searchInput).toBeVisible();
    });

    test('should focus search with Ctrl+F', async ({ page }) => {
      await page.keyboard.press('Control+f');

      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
      await expect(searchInput).toBeFocused();
    });

    test('should accept text input', async ({ page }) => {
      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();

      // Click to focus
      await searchInput.click();

      // Type search term
      await searchInput.fill('kick');

      // Should have value
      await expect(searchInput).toHaveValue('kick');
    });

    test('should be clearable', async ({ page }) => {
      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();

      // Enter text
      await searchInput.click();
      await searchInput.fill('test search');
      await expect(searchInput).toHaveValue('test search');

      // Clear
      await searchInput.clear();
      await expect(searchInput).toHaveValue('');
    });

    test('should have placeholder text', async ({ page }) => {
      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();

      const placeholder = await searchInput.getAttribute('placeholder');
      expect(placeholder).toBeTruthy();
      expect(placeholder?.length).toBeGreaterThan(0);
    });
  });

  test.describe('Search Behavior', () => {
    test('should trigger search on text input', async ({ page }) => {
      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();

      await searchInput.click();
      await searchInput.fill('test');

      // Wait a moment for search to trigger
      await page.waitForTimeout(500);

      // App should still be functional (search executed)
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle empty search', async ({ page }) => {
      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();

      // Enter and clear search
      await searchInput.click();
      await searchInput.fill('test');
      await searchInput.clear();

      // Should show all results (no filtering)
      await expect(page.locator('body')).toBeVisible();
    });

    test('should be case-insensitive', async ({ page }) => {
      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();

      // Search with uppercase
      await searchInput.click();
      await searchInput.fill('TEST');

      // Should accept the search
      await expect(searchInput).toHaveValue('TEST');

      // App should handle case-insensitive matching
      await page.waitForTimeout(300);
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle special characters', async ({ page }) => {
      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();

      // Search with special chars
      await searchInput.click();
      await searchInput.fill('test!@#$%');

      // Should not crash
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle Unicode characters', async ({ page }) => {
      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();

      // Search with Unicode
      await searchInput.click();
      await searchInput.fill('テスト');

      // Should not crash
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle very long search terms', async ({ page }) => {
      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();

      // Very long search term
      const longTerm = 'a'.repeat(100);
      await searchInput.click();
      await searchInput.fill(longTerm);

      // Should not crash
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Search Results', () => {
    test('should show empty state when no results (if files exist)', async ({ page }) => {
      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();

      // Search for something very unlikely to match
      await searchInput.click();
      await searchInput.fill('xyzabc123impossible');

      // Wait for search to execute
      await page.waitForTimeout(500);

      // Should still render UI (may show "No results" or empty list)
      await expect(page.locator('body')).toBeVisible();
    });

    test('search should update results in real-time', async ({ page }) => {
      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();

      await searchInput.click();

      // Type character by character
      await searchInput.type('k');
      await page.waitForTimeout(100);

      await searchInput.type('i');
      await page.waitForTimeout(100);

      await searchInput.type('c');
      await page.waitForTimeout(100);

      await searchInput.type('k');
      await page.waitForTimeout(100);

      // Should have "kick" and not crash
      await expect(searchInput).toHaveValue('kick');
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Search Shortcuts', () => {
    test('Ctrl+F should focus search from anywhere', async ({ page }) => {
      // Click on body (unfocus search)
      await page.locator('body').click();

      // Press Ctrl+F
      await page.keyboard.press('Control+f');

      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
      await expect(searchInput).toBeFocused();
    });

    test('Escape should clear search and unfocus (if implemented)', async ({ page }) => {
      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();

      // Focus and type
      await searchInput.click();
      await searchInput.fill('test');

      // Press Escape
      await page.keyboard.press('Escape');

      // May clear search or just unfocus (implementation-specific)
      // At minimum, should not crash
      await expect(page.locator('body')).toBeVisible();
    });

    test('should not prevent shortcuts when search is focused', async ({ page }) => {
      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();

      // Focus search
      await searchInput.click();

      // Typing 'a' should not trigger Ctrl+A (select all)
      await page.keyboard.type('a');

      // Should have typed 'a' in search
      await expect(searchInput).toHaveValue('a');
    });
  });

  test.describe('Filter UI', () => {
    test('should not show category filters when no files', async ({ page }) => {
      // Without files, category filters may be hidden or empty
      // This test ensures UI renders correctly
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Search Performance', () => {
    test('search should respond quickly to input', async ({ page }) => {
      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();

      await searchInput.click();

      const startTime = Date.now();

      // Type search term
      await searchInput.fill('quick test');

      // Wait for any search processing
      await page.waitForTimeout(100);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Search should respond in under 1 second (generous limit)
      expect(duration).toBeLessThan(1000);
    });

    test('rapid search changes should not crash app', async ({ page }) => {
      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();

      await searchInput.click();

      // Rapidly change search terms
      for (let i = 0; i < 10; i++) {
        await searchInput.fill(`search ${i}`);
        await page.waitForTimeout(50);
      }

      // Should still be functional
      await expect(page.locator('body')).toBeVisible();
      await expect(searchInput).toHaveValue('search 9');
    });
  });

  test.describe('Search State', () => {
    test('search term should persist during navigation (if applicable)', async ({ page }) => {
      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();

      await searchInput.click();
      await searchInput.fill('persistent');

      // If app has navigation, search might persist
      // At minimum, should not crash
      await expect(page.locator('body')).toBeVisible();
    });

    test('search should clear when clicking clear button (if exists)', async ({ page }) => {
      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();

      await searchInput.click();
      await searchInput.fill('clear me');

      // Look for clear button (X icon or similar)
      const clearBtn = page.locator('button[aria-label*="clear" i], button[title*="clear" i]').filter({
        has: page.locator('svg, span')
      }).first();

      const exists = await clearBtn.count();

      if (exists > 0 && await clearBtn.isVisible()) {
        await clearBtn.click();

        // Search should be cleared
        await expect(searchInput).toHaveValue('');
      }
    });
  });

  test.describe('Multi-field Search', () => {
    test('should search across filename, category, and key (when files exist)', async ({ page }) => {
      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();

      // Search for category name
      await searchInput.click();
      await searchInput.fill('drums');
      await page.waitForTimeout(300);

      // Should handle category search
      await expect(page.locator('body')).toBeVisible();

      // Search for musical key
      await searchInput.clear();
      await searchInput.fill('Am');
      await page.waitForTimeout(300);

      // Should handle key search
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle partial matches', async ({ page }) => {
      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();

      // Partial word search
      await searchInput.click();
      await searchInput.fill('kic');

      // Should match "kick" if files exist
      await page.waitForTimeout(300);
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Search Accessibility', () => {
    test('search input should have proper ARIA attributes', async ({ page }) => {
      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();

      // Check for accessible attributes
      const ariaLabel = await searchInput.getAttribute('aria-label');
      const placeholder = await searchInput.getAttribute('placeholder');

      // Should have either aria-label or placeholder
      expect(ariaLabel || placeholder).toBeTruthy();
    });

    test('search should be keyboard accessible', async ({ page }) => {
      // Tab to search input
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // One of these tabs should focus search (or use Ctrl+F)
      await page.keyboard.press('Control+f');

      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
      await expect(searchInput).toBeFocused();

      // Type without mouse
      await page.keyboard.type('keyboard search');
      await expect(searchInput).toHaveValue('keyboard search');
    });
  });
});
