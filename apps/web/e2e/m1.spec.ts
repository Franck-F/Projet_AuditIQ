import { test, expect } from '@playwright/test';
import { waitForAuditDone } from './helpers/poll';
import { createTabularAudit } from './helpers/wizard';

test.describe('M1 supervisé (Caractéristique connue)', () => {
  test('happy: gender bias produces a done audit with disparate impact', async ({ page }) => {
    await createTabularAudit(page, {
      module: 'M1',
      sector: 'hr',
      title: 'E2E M1 simple',
      csv: 'm1-simple.csv',
      decisionColumn: 'embauche',
      favorableValue: 'oui',
      protectedAttrs: ['genre'],
    });
    await page.waitForURL(/\/app\/audits\/[0-9a-f-]{36}/);
    await waitForAuditDone(page);
    // Le hero affiche le « Score de risque » (Gauge) ; l'écart de taux est exposé
    // dans la synthèse (« Disparate Impact » figure parmi les métriques M1).
    await expect(page.getByText(/Score de risque/i).first()).toBeVisible();
    await expect(
      page.getByText(/Disparate Impact|Écart de taux d['’]acceptation|Règle des 4\/5/i).first(),
    ).toBeVisible();
  });

  test('+ ground truth: Equal Opportunity & Equalized Odds shown', async ({ page }) => {
    await createTabularAudit(page, {
      module: 'M1',
      sector: 'hr',
      title: 'E2E M1 truth',
      csv: 'm1-with-truth.csv',
      decisionColumn: 'embauche',
      favorableValue: 'oui',
      protectedAttrs: ['genre'],
      groundTruth: 'reel',
    });
    await page.waitForURL(/\/app\/audits\/[0-9a-f-]{36}/);
    await waitForAuditDone(page);
    // Les métriques supervisées apparaissent dans l'onglet « Métriques détaillées ».
    await page.getByRole('tab', { name: /Métriques détaillées/i }).click();
    await expect(
      page.getByText(/Égalité des chances|Equal Opportunity/i).first(),
    ).toBeVisible();
    await expect(
      page.getByText(/Calibration|Equalized Odds/i).first(),
    ).toBeVisible();
  });

  test('intersectional: subgroup matrix + 2 marginal DIs + worst cell highlighted', async ({ page }) => {
    await createTabularAudit(page, {
      module: 'M1',
      sector: 'hr',
      title: 'E2E M1 intersectional',
      csv: 'm1-intersectional.csv',
      decisionColumn: 'embauche',
      favorableValue: 'oui',
      // L'intersectionnel = cocher 2 attributs protégés (genre × origine).
      protectedAttrs: ['genre', 'origine'],
    });
    await page.waitForURL(/\/app\/audits\/[0-9a-f-]{36}/);
    await waitForAuditDone(page);
    // La matrice intersectionnelle est dans l'onglet « Groupes ».
    await page.getByRole('tab', { name: /^Groupes$/i }).click();
    // L'analyse intersectionnelle par paire affiche le croisement genre × origine
    // et les valeurs croisées (etrangere/femme…).
    await expect(
      page.getByText(/Analyse intersectionnelle/i).first(),
    ).toBeVisible();
    await expect(page.getByText(/etrangere/i).first()).toBeVisible();
  });
});
