import { test, expect } from '@playwright/test';

test.describe('auth', () => {
  test('storageState is valid — /app is accessible without re-login', async ({ page }) => {
    await page.goto('/app');
    // If storageState is OK, /app renders (dashboard or audits list).
    // If broken, the middleware redirects to /connexion.
    await expect(page).not.toHaveURL(/\/connexion/);
    // soft check: header / nav text consistent with the protected layout
    await expect(page.locator('body')).toContainText(/audit|tableau|dashboard/i);
  });
});
