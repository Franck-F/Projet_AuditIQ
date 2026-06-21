import { test, expect } from '@playwright/test';
import { waitForAuditDone } from './helpers/poll';
import { createTabularAudit } from './helpers/wizard';

test.describe('M2 non supervisé (Biais cachés)', () => {
  test('happy: clusters table + chi² + verdict', async ({ page }) => {
    await createTabularAudit(page, {
      module: 'M2',
      sector: 'credit',
      title: 'E2E M2',
      csv: 'm2.csv',
      decisionColumn: 'decision',
      favorableValue: 'oui',
    });
    await page.waitForURL(/\/app\/audits\/[0-9a-f-]{36}/);
    await waitForAuditDone(page);

    // Verdict (« Risque faible / Vigilance / Risque élevé ») + score de risque
    // dans le hero.
    await expect(page.getByText(/Score de risque/i).first()).toBeVisible();
    await expect(
      page.getByText(/Risque faible|Vigilance|Risque élevé/i).first(),
    ).toBeVisible();

    // Le test du χ² figure dans l'onglet « Métriques détaillées » (détails techniques).
    await page.getByRole('tab', { name: /Métriques détaillées/i }).click();
    await expect(page.getByText(/Test statistique/i).first()).toBeVisible();
    await page.getByText(/Détails techniques/i).first().click();
    await expect(page.getByText(/χ²|Test du χ/i).first()).toBeVisible();

    // La table / carte des clusters est dans l'onglet « Groupes détectés ».
    await page.getByRole('tab', { name: /Groupes détectés/i }).click();
    await expect(
      page.getByText(/Carte des groupes détectés|Classement des groupes/i).first(),
    ).toBeVisible();
  });
});
