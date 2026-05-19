# End-to-End Tests with Playwright

This directory contains Playwright end-to-end tests for Clean Track Buddy.

## Test Structure

- `example.spec.ts` - Basic UI tests
- `user-flow.spec.ts` - User flow and interaction tests

## Running Tests

### Interactive UI Mode (Recommended for development)
```bash
npm run test:e2e:ui
```

This opens Playwright's interactive UI where you can:
- See all tests
- Run tests individually
- Watch tests run in real-time
- Debug failed tests

### Headless Mode (CI/Fast)
```bash
npm run test:e2e
```

### Headed Mode (See browser)
```bash
npm run test:e2e:headed
```

### Debug Mode (Step through)
```bash
npm run test:e2e:debug
```

### View Test Report
```bash
npm run test:report
```

## What These Tests Cover

Currently, these tests run against the **web version** of the app (not the Tauri desktop app). They test:

✅ UI rendering and visibility
✅ Button interactions
✅ Dialog open/close
✅ Keyboard shortcuts
✅ Settings management
✅ Navigation and search

## Limitations

⚠️ **File Upload**: Browser-based tests cannot test drag-and-drop of actual audio files from the OS
⚠️ **Tauri APIs**: Tauri-specific features (fs, dialog, etc.) are not tested
⚠️ **Native Features**: Desktop-specific features require WebDriver testing

## Writing New Tests

### Basic Pattern

```typescript
import { test, expect } from '@playwright/test';

test('should do something', async ({ page }) => {
  await page.goto('/');

  // Find element
  const button = page.getByRole('button', { name: /click me/i });

  // Interact
  await button.click();

  // Assert
  await expect(page.getByText('Success')).toBeVisible();
});
```

### Best Practices

1. **Use semantic selectors**: Prefer `getByRole`, `getByLabel`, `getByText` over CSS selectors
2. **Wait for states**: Use `waitForLoadState`, `waitForSelector` when needed
3. **Assertions**: Always use `expect` from Playwright, not external libraries
4. **Isolation**: Each test should be independent
5. **Descriptive names**: Test names should clearly describe what they test

## Adding Tests for New Features

When adding a new feature to the app:

1. Add a test in the appropriate spec file (or create a new one)
2. Test the happy path first
3. Add edge cases if relevant
4. Run tests locally before committing
5. Consider adding tests to CI

## CI Integration

Tests can be added to GitHub Actions:

```yaml
- name: Run E2E Tests
  run: npm run test:e2e
```

## Debugging Failed Tests

1. Run with UI: `npm run test:e2e:ui`
2. Check the screenshots in `test-results/`
3. Use trace viewer: Tests automatically save traces on failure
4. Add `await page.pause()` in your test to debug interactively

## Testing the Tauri Desktop App

To test the actual Tauri desktop app (not just the web UI), you would need:

1. WebDriver support in Tauri
2. Additional configuration
3. Platform-specific setup

This is more complex and should be considered for future enhancement.
