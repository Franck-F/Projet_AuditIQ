import { test, expect } from '@playwright/test';
import { waitForAuditDone } from './helpers/poll';
import { createTabularAudit } from './helpers/wizard';

test.describe('Unified wizard guided flow', () => {
  test('M1 path (tabular-known): walks 5 steps + creates audit', async ({ page }) => {
    await createTabularAudit(page, {
      module: 'M1',
      sector: 'credit',
      title: 'E2E M1',
      csv: 'm1-simple.csv',
      decisionColumn: 'embauche',
      favorableValue: 'oui',
      protectedAttrs: ['genre'],
    });
    // « Lancer l'audit » redirige vers la page résultat /app/audits/{uuid}.
    await page.waitForURL(/\/app\/audits\/[a-f0-9-]{36}$/, { timeout: 30_000 });
    await waitForAuditDone(page);
    await expect(page.getByText(/Résultat de l['’]audit/i).first()).toBeVisible();
  });
});
