import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium, type FullConfig } from '@playwright/test';
import { adminCreateUser } from './helpers/supabase';

const AUTH_DIR = path.resolve(__dirname, '.auth');
const STATE_PATH = path.join(AUTH_DIR, 'user.json');
const META_PATH = path.join(AUTH_DIR, 'meta.json');

interface Meta {
  user_id: string;
  email: string;
  created_at: string;
}

/**
 * Admin-creates a fresh Supabase user via REST (service-role), then drives
 * Chromium through the /connexion form so the @supabase/ssr browser client
 * sets its cookies. We persist Playwright's storageState — Supabase SSR uses
 * cookies (not localStorage) for the proxy.ts `getUser()` check, so a
 * REST-only synthesized storageState would not authenticate.
 */
export default async function globalSetup(_config: FullConfig): Promise<void> {
  const baseUrl = process.env.WEB_BASE_URL ?? 'http://localhost:3000';
  const ts = Date.now();
  const email = `auditiq-e2e+${ts}@example.com`;
  const password = `E2E!${ts}aZ9q`;

  const user = await adminCreateUser(email, password);

  await fs.mkdir(AUTH_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/connexion`, { waitUntil: 'networkidle' });
    // Ensure the form is mounted AND react-hook-form has bound its handler.
    // We click only after `Se connecter` is enabled — that signals React has
    // hydrated. Submitting before hydration falls back to the native GET form
    // submission (query-string params in the URL), which fails the test.
    const submit = page.getByRole('button', { name: /se connecter/i });
    await submit.waitFor({ state: 'visible' });
    await page.locator('#email').fill(email);
    await page.locator('#pwd').fill(password);
    await Promise.all([
      page.waitForURL(/\/app(\/.*)?$/, { timeout: 60_000 }),
      submit.click(),
    ]);
    await context.storageState({ path: STATE_PATH });
  } finally {
    await browser.close();
  }

  const meta: Meta = {
    user_id: user.id,
    email: user.email,
    created_at: new Date().toISOString(),
  };
  await fs.writeFile(META_PATH, JSON.stringify(meta, null, 2), 'utf8');

  console.log(`[e2e setup] created test user ${email} (${user.id})`);
}
