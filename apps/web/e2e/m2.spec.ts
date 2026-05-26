import path from 'node:path';
import { test, expect } from '@playwright/test';
import { waitForAuditDone } from './helpers/poll';

const FIXTURES = path.resolve(__dirname, 'fixtures');

test.describe('M2 non supervisé', () => {
  test('happy: clusters table + chi² + verdict', async ({ page }) => {
    await page.goto('/app/audits/nouveau');
    await page.getByRole('button', { name: /détection non supervis/i })
      .click();
    await page.locator('[data-testid="csv-input"]').setInputFiles(
      path.join(FIXTURES, 'm2.csv'),
    );
    await page.getByLabel(/titre/i).fill('E2E M2');
    await page.getByLabel(/colonne de d/i).selectOption('decision');
    await page.getByLabel(/valeur favorable/i).fill('oui');
    await page.getByRole('button', { name: /lancer|créer/i }).click();
    await page.waitForURL(/\/app\/audits\/[0-9a-f-]{36}/);
    await waitForAuditDone(page);
    // M2 result page renders the clusters table + chi² test.
    await expect(page.getByText(/Par cluster|cluster/i).first()).toBeVisible();
    await expect(page.getByText(/χ²|chi/i).first()).toBeVisible();
    await expect(page.getByText(/Score de risque/i)).toBeVisible();
  });
});
