import { type Page, test, expect } from '@playwright/test';
import { waitForAuditDone } from './helpers/poll';
import { createTabularAudit } from './helpers/wizard';

async function createDoneM1(page: Page): Promise<void> {
  await createTabularAudit(page, {
    module: 'M1',
    sector: 'hr',
    title: 'E2E reports',
    csv: 'm1-simple.csv',
    decisionColumn: 'embauche',
    favorableValue: 'oui',
    protectedAttrs: ['genre'],
  });
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
