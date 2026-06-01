import { test, expect } from '@playwright/test';

test.describe('M2 wizard guided flow', () => {
  test('walks through 5 steps and creates an audit', async ({ page }) => {
    await page.goto('/app/audits/nouveau');

    await page.getByRole('button', { name: /Détection non supervisée/i }).click();

    await page.getByRole('textbox', { name: /titre/i }).fill('E2E M2 wizard test');
    await page.getByRole('button', { name: /Suivant/i }).click();

    const fileInput = page.getByTestId('csv-input');
    await fileInput.setInputFiles('e2e/fixtures/m2.csv');
    await expect(page.getByText(/Analyse automatique/i)).toBeVisible({ timeout: 30000 });
    await page.getByRole('button', { name: /Suivant/i }).click();

    await page.getByRole('combobox', { name: /Colonne de décision/i }).selectOption({ index: 1 });
    await page.getByRole('combobox', { name: /Valeur favorable/i }).selectOption({ index: 1 });
    await page.getByRole('button', { name: /Suivant/i }).click();

    // Skip advanced (defaults)
    await page.getByRole('button', { name: /Suivant/i }).click();

    await expect(page.getByText(/Récapitulatif/i)).toBeVisible();
    await page.getByRole('button', { name: /Terminer/i }).click();

    await page.waitForURL(/\/app\/audits\/[a-f0-9-]+$/, { timeout: 30000 });
    await expect(page.getByRole('heading', { name: /E2E M2 wizard/i })).toBeVisible({ timeout: 90000 });
  });
});
