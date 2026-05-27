import path from 'node:path';
import { type Page, test, expect } from '@playwright/test';
import { waitForAuditDone } from './helpers/poll';

const FIXTURES = path.resolve(__dirname, 'fixtures');

async function gotoNewAudit(page: Page): Promise<void> {
  await page.goto('/app/audits/nouveau');
}

async function chooseModuleM1(page: Page): Promise<void> {
  await page.getByRole('button', { name: /audit supervis/i }).click();
}

async function uploadCsv(page: Page, file: string): Promise<void> {
  const input = page.locator('[data-testid="csv-input"]');
  await input.setInputFiles(path.join(FIXTURES, file));
}

test.describe('M1 supervisé', () => {
  test('happy: gender bias produces a done audit with disparate impact', async ({ page }) => {
    await gotoNewAudit(page);
    await chooseModuleM1(page);
    await uploadCsv(page, 'm1-simple.csv');
    await page.getByLabel(/titre/i).fill('E2E M1 simple');
    await page.getByLabel(/attribut prot/i).selectOption('genre');
    await page.getByLabel(/colonne de d/i).selectOption('embauche');
    await page.getByLabel(/valeur favorable/i).fill('oui');
    await page.getByRole('button', { name: /lancer|créer/i }).click();
    await page.waitForURL(/\/app\/audits\/[0-9a-f-]{36}/);
    await waitForAuditDone(page);
    await expect(page.getByText(/Disparate Impact/i).first()).toBeVisible();
    await expect(page.getByText(/Score de risque/i).first()).toBeVisible();
  });

  test('+ ground truth: Equal Opportunity & Equalized Odds shown', async ({ page }) => {
    await gotoNewAudit(page);
    await chooseModuleM1(page);
    await uploadCsv(page, 'm1-with-truth.csv');
    await page.getByLabel(/titre/i).fill('E2E M1 truth');
    await page.getByLabel(/attribut prot/i).selectOption('genre');
    await page.getByLabel(/colonne de d/i).selectOption('embauche');
    await page.getByLabel(/valeur favorable/i).fill('oui');
    await page.getByLabel(/résultat réel|vérité.?terrain/i)
      .selectOption('reel');
    await page.getByRole('button', { name: /lancer|créer/i }).click();
    await page.waitForURL(/\/app\/audits\/[0-9a-f-]{36}/);
    await waitForAuditDone(page);
    await expect(
      page.getByText(/Equal Opportunity|égalité des chances/i).first(),
    ).toBeVisible();
    await expect(
      page.getByText(/Equalized Odds|cotes égalisées/i).first(),
    ).toBeVisible();
  });

  test('intersectional: subgroup matrix + 2 marginal DIs + worst cell highlighted', async ({ page }) => {
    await gotoNewAudit(page);
    await chooseModuleM1(page);
    await uploadCsv(page, 'm1-intersectional.csv');
    await page.getByLabel(/titre/i).fill('E2E M1 intersectional');
    await page.getByLabel(/attribut prot/i).selectOption('genre');
    await page.getByLabel(/colonne de d/i).selectOption('embauche');
    await page.getByLabel(/valeur favorable/i).fill('oui');
    await page.getByLabel(/attribut secondaire|attribut.*intersection/i)
      .selectOption('origine');
    await page.getByRole('button', { name: /lancer|créer/i }).click();
    await page.waitForURL(/\/app\/audits\/[0-9a-f-]{36}/);
    await waitForAuditDone(page);
    // The subgroup matrix renders the crossed cell labels (e.g. etr/femme).
    await expect(page.getByText(/intersection|sous-groupe/i).first()).toBeVisible();
    await expect(page.getByText(/etrangere/i).first()).toBeVisible();
    // The 2 marginal DIs appear side-by-side. With this dataset both = 1.0
    // and the worst crossed DI ≈ 0.33 (fail) — assert by presence of "0.33" or "0.3".
    await expect(page.getByText(/0\.33|0\.3/).first()).toBeVisible();
  });
});
