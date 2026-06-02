import { test, expect } from '@playwright/test';

test.describe('Unified wizard guided flow', () => {
  test('M1 path (tabular-known): walks 5 steps + creates audit', async ({ page }) => {
    await page.goto('/app/audits/nouveau');
    // Step 1
    await page.getByRole('textbox', { name: /titre/i }).fill('E2E M1');
    await page.getByRole('button', { name: /Modèle ML tabulaire.*attribut sensible/i }).click();
    await page.getByRole('button', { name: /Crédit/i }).click();
    await page.getByRole('button', { name: /Suivant/i }).click();
    // Step 2: upload CSV
    await page.getByTestId('csv-input').setInputFiles('e2e/fixtures/m1-simple.csv');
    await expect(page.getByText(/Analyse automatique/i)).toBeVisible({ timeout: 30000 });
    await page.getByRole('button', { name: /Suivant/i }).click();
    // Step 3
    await page.getByRole('combobox', { name: /Colonne de décision/i }).selectOption({ index: 1 });
    await page.getByRole('combobox', { name: /Valeur favorable/i }).selectOption({ index: 1 });
    await page.getByRole('combobox', { name: /Attribut protégé/i }).selectOption({ index: 1 });
    await page.getByRole('button', { name: /Suivant/i }).click();
    // Step 4
    await page.getByRole('button', { name: /Suivant/i }).click();
    // Step 5
    await expect(page.getByText(/Récapitulatif/i)).toBeVisible();
    await page.getByRole('button', { name: /Terminer/i }).click();
    await page.waitForURL(/\/app\/audits\/[a-f0-9-]+$/, { timeout: 30000 });
  });
});
