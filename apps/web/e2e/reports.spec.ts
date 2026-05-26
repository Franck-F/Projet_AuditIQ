import path from 'node:path';
import { test, expect } from '@playwright/test';
import { waitForAuditDone } from './helpers/poll';

const FIXTURES = path.resolve(__dirname, 'fixtures');

async function createDoneM1(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/app/audits/nouveau');
  await page.getByRole('button', { name: /audit supervis/i }).click();
  await page.locator('[data-testid="csv-input"]').setInputFiles(
    path.join(FIXTURES, 'm1-simple.csv'),
  );
  await page.getByLabel(/titre/i).fill('E2E reports');
  await page.getByLabel(/attribut prot/i).selectOption('genre');
  await page.getByLabel(/colonne de d/i).selectOption('embauche');
  await page.getByLabel(/valeur favorable/i).fill('oui');
  await page.getByRole('button', { name: /lancer|créer/i }).click();
  await page.waitForURL(/\/app\/audits\/[0-9a-f-]{36}/);
  await waitForAuditDone(page);
}

test.describe('reports', () => {
  test('downloads the Excel report (.xlsx)', async ({ page }) => {
    await createDoneM1(page);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /excel/i }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/i);
  });

  test('downloads the PDF report (.pdf)', async ({ page }) => {
    await createDoneM1(page);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /pdf/i }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
  });
});
