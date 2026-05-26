import { type Page, test, expect } from '@playwright/test';
import { waitForAuditDone, sawRunningState } from './helpers/poll';

const HTTPBIN_OK = 'https://httpbin.org/anything';
const SSRF_METADATA = 'http://169.254.169.254/latest';
const HTTPBIN_503 = 'https://httpbin.org/status/503';

async function chooseModuleM3(page: Page): Promise<void> {
  await page.goto('/app/audits/nouveau');
  await page.getByRole('button', { name: /llm|chatbot/i }).click();
}

async function fillM3Form(
  page: Page,
  url: string,
  title: string,
): Promise<void> {
  await page.getByLabel(/titre/i).fill(title);
  await page.getByLabel(/url/i).fill(url);
  // The preset selector defaults to OpenAI-compatible — that's fine; we only
  // need the URL to differ. body_template / response_path are pre-filled.
}

test.describe('M3 LLM/chatbot', () => {
  test('happy: httpbin echo target → polling → done', async ({ page }) => {
    await chooseModuleM3(page);
    await fillM3Form(page, HTTPBIN_OK, 'E2E M3 happy');
    // Re-write the body_template + response_path for httpbin (it echoes JSON
    // back at .json.<key>).
    await page.getByLabel(/corps de requête|body/i).fill(
      '{"p":"{prompt}"}',
    );
    await page.getByLabel(/chemin de la réponse|response.?path/i).fill(
      'json.p',
    );
    await page.getByRole('button', { name: /lancer|créer/i }).click();
    await page.waitForURL(/\/app\/audits\/[0-9a-f-]{36}/);
    // soft check that polling exposed the running state at least once
    await sawRunningState(page);
    await waitForAuditDone(page, { timeout: 90_000 });
    await expect(page.getByText(/Score de risque|risk/i).first()).toBeVisible();
  });

  test('SSRF: cloud metadata URL → immediate 422, no redirect', async ({ page }) => {
    await chooseModuleM3(page);
    await fillM3Form(page, SSRF_METADATA, 'E2E M3 SSRF');
    await page.getByLabel(/corps de requête|body/i).fill('{"p":"{prompt}"}');
    await page.getByLabel(/chemin de la réponse|response.?path/i).fill('a');
    await page.getByRole('button', { name: /lancer|créer/i }).click();
    // The wizard catches the 422 and shows an inline error; the URL must NOT
    // change to /app/audits/{id}.
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/app\/audits\/nouveau/);
  });

  test('all-calls-fail-non-fatal: 503 target → done with failures counted', async ({ page }) => {
    await chooseModuleM3(page);
    await fillM3Form(page, HTTPBIN_503, 'E2E M3 503');
    await page.getByLabel(/corps de requête|body/i).fill('{"p":"{prompt}"}');
    await page.getByLabel(/chemin de la réponse|response.?path/i).fill('json.p');
    await page.getByRole('button', { name: /lancer|créer/i }).click();
    await page.waitForURL(/\/app\/audits\/[0-9a-f-]{36}/);
    // Per-call 5xx is caught by run_m3_audit's _one() → audit ends DONE
    // with n_calls_failed > 0; it does NOT end in `failed` status.
    await waitForAuditDone(page, { timeout: 90_000 });
    await expect(page.getByText(/appels en échec|n_calls_failed/i).first())
      .toBeVisible();
    // Sanity: no error panel
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
});
