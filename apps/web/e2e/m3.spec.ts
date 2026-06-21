import { test, expect } from '@playwright/test';
import { waitForAuditDone, sawRunningState } from './helpers/poll';
import { createLlmAudit } from './helpers/wizard';

const HTTPBIN_OK = 'https://httpbin.org/anything';
const SSRF_METADATA = 'http://169.254.169.254/latest';
const HTTPBIN_503 = 'https://httpbin.org/status/503';

test.describe('M3 LLM/chatbot (Assistant conversationnel)', () => {
  test('happy: httpbin echo target → polling → done', async ({ page }) => {
    // httpbin renvoie le corps posté sous `.json.<clé>` — on calibre body +
    // response_path en conséquence (préréglage « Personnalisé »).
    await createLlmAudit(page, {
      sector: 'hr',
      title: 'E2E M3 happy',
      url: HTTPBIN_OK,
      bodyTemplate: '{"p":"{prompt}"}',
      responsePath: 'json.p',
    });
    await page.waitForURL(/\/app\/audits\/[0-9a-f-]{36}/);
    // soft check : le polling a exposé l'état « en cours » au moins une fois.
    await sawRunningState(page);
    await waitForAuditDone(page, { timeout: 120_000 });
    await expect(page.getByText(/Score de risque/i).first()).toBeVisible();
  });

  test('SSRF: cloud metadata URL → immediate error, no redirect', async ({ page }) => {
    // L'URL de métadonnées cloud est bloquée côté API (422) ; le wizard attrape
    // l'erreur et affiche un message inline — l'URL ne doit PAS changer.
    await createLlmAudit(
      page,
      {
        sector: 'hr',
        title: 'E2E M3 SSRF',
        url: SSRF_METADATA,
        bodyTemplate: '{"p":"{prompt}"}',
        responsePath: 'a',
      },
      { launch: true },
    );
    // Le bloc d'erreur (role=alert) apparaît ; on reste sur l'étape de création.
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/app\/audits\/nouveau/);
  });

  test('all-calls-fail-non-fatal: 503 target → done, not failed', async ({ page }) => {
    await createLlmAudit(page, {
      sector: 'hr',
      title: 'E2E M3 503',
      url: HTTPBIN_503,
      bodyTemplate: '{"p":"{prompt}"}',
      responsePath: 'json.p',
    });
    await page.waitForURL(/\/app\/audits\/[0-9a-f-]{36}/);
    // Per-call 5xx est attrapé par run_m3_audit → l'audit se termine en DONE
    // (avec n_calls_failed > 0), il ne passe PAS en statut `failed`.
    await waitForAuditDone(page, { timeout: 120_000 });
    // Contrat clé : statut `done` (Score de risque visible ci-dessus) ET pas de
    // panneau d'échec d'audit.
    await expect(page.getByText(/L['’]audit a échoué/i)).toHaveCount(0);
  });
});
