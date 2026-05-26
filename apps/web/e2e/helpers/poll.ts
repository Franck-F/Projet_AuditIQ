import { type Page, expect } from '@playwright/test';

/** Wait until the audit result page reaches a terminal state.
 *  The web result page renders FR copy:
 *    - running:  "Analyse en cours"
 *    - failed:   error panel (role=alert) — heading typically contains "Échec"
 *    - done:     module-specific KPIs ("Score de risque" / "Disparate Impact" / etc.)
 *
 *  We watch the FRONT for the terminal text — the front polls /audits/{id} every 2s. */
export async function waitForAuditDone(
  page: Page,
  { timeout = 60_000 } = {},
): Promise<void> {
  await expect(page.getByText(/Score de risque|Disparate Impact/i)).toBeVisible({ timeout });
}

export async function waitForAuditFailed(
  page: Page,
  { timeout = 60_000 } = {},
): Promise<void> {
  // failed panel uses role="alert"
  await expect(page.getByRole('alert')).toBeVisible({ timeout });
  await expect(page.getByText(/Échec|failed/i)).toBeVisible({ timeout });
}

/** Soft check that we passed through the running state (the polling tick may
 *  jump straight to done on fast modules; do not assert it strictly). */
export async function sawRunningState(page: Page): Promise<boolean> {
  try {
    await page
      .getByText(/Analyse en cours/i)
      .waitFor({ state: 'visible', timeout: 5_000 });
    return true;
  } catch {
    return false;
  }
}
