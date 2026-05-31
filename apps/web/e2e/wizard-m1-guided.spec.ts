import path from 'node:path';
import { test, expect } from '@playwright/test';
import { waitForAuditDone } from './helpers/poll';

const FIXTURES = path.resolve(__dirname, 'fixtures');

/**
 * E2E happy path for the new M1 guided wizard.
 *
 * The guided wizard is a 5-step form that walks through:
 * 1. Module choice (Audit supervisé)
 * 2. Title input
 * 3. CSV upload & auto-analysis
 * 4. Decision column + favorable value selection
 * 5. Protected attribute selection
 * 6. Review & submit
 *
 * Requires the live stack (API + PDF + Web) + Supabase auth storage state.
 * This spec is NOT auto-run in CI; run manually post-merge with WARP enabled.
 */

test.describe('M1 wizard guided flow', () => {
  test('happy path: 5 steps → audit created', async ({ page }) => {
    // Start at /app/audits/nouveau
    await page.goto('/app/audits/nouveau');

    // Step 1: Choose module (Audit supervisé)
    await page.getByRole('button', { name: /audit supervis/i }).click();

    // Step 2: Enter title
    await page.getByLabel(/titre/i).fill('E2E wizard guided test');
    await page.getByRole('button', { name: /suivant/i }).click();

    // Step 3: Upload CSV & wait for auto-analysis
    const csvInput = page.locator('[data-testid="csv-input"]');
    await csvInput.setInputFiles(path.join(FIXTURES, 'm1-simple.csv'));
    // Wait for the analysis to complete (look for "Analyse" or similar)
    await expect(page.getByText(/analyse|analyzing/i)).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole('button', { name: /suivant/i }).click();

    // Step 4: Select decision column & favorable value
    await page.getByLabel(/colonne de d/i).selectOption('embauche');
    await page.getByLabel(/valeur favorable/i).fill('oui');
    await page.getByRole('button', { name: /suivant/i }).click();

    // Step 5: Select protected attribute
    await page.getByLabel(/attribut prot/i).selectOption('genre');
    await page.getByRole('button', { name: /suivant/i }).click();

    // Step 6: Review & submit (if present in guided flow)
    // May land directly on audit detail or show a final confirm button
    await page.getByRole('button', { name: /lancer|créer|terminer/i }).click();

    // Should land on /app/audits/<id>
    await page.waitForURL(/\/app\/audits\/[0-9a-f-]{36}/, { timeout: 30_000 });

    // Wait for audit to complete
    await waitForAuditDone(page);

    // Verify audit detail page loaded with title
    await expect(page.getByText(/E2E wizard guided/i)).toBeVisible({
      timeout: 90_000,
    });
  });
});
