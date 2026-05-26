import fs from 'node:fs/promises';
import path from 'node:path';
import type { FullConfig } from '@playwright/test';
import {
  adminCreateUser,
  passwordGrant,
  projectRef,
  type SessionTokens,
} from './helpers/supabase';

const AUTH_DIR = path.resolve(__dirname, '.auth');
const STATE_PATH = path.join(AUTH_DIR, 'user.json');
const META_PATH = path.join(AUTH_DIR, 'meta.json');

interface Meta {
  user_id: string;
  email: string;
  created_at: string;
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  const baseUrl = process.env.WEB_BASE_URL ?? 'http://localhost:3000';
  const ts = Date.now();
  const email = `auditiq-e2e+${ts}@example.com`;
  const password = `E2E!${ts}aZ9q`;

  const user = await adminCreateUser(email, password);
  const tokens: SessionTokens = await passwordGrant(email, password);
  // The Supabase browser client stores its session at
  //   localStorage[`sb-${projectRef}-auth-token`] = JSON.stringify({...})
  const key = `sb-${projectRef()}-auth-token`;
  const value = JSON.stringify({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: tokens.expires_in,
    expires_at:
      tokens.expires_at ?? Math.floor(Date.now() / 1000) + tokens.expires_in,
    token_type: tokens.token_type,
    user: tokens.user,
  });

  const origin = new URL(baseUrl).origin;
  const storageState = {
    cookies: [],
    origins: [
      {
        origin,
        localStorage: [{ name: key, value }],
      },
    ],
  };

  await fs.mkdir(AUTH_DIR, { recursive: true });
  await fs.writeFile(STATE_PATH, JSON.stringify(storageState, null, 2), 'utf8');
  const meta: Meta = {
    user_id: user.id,
    email: user.email,
    created_at: new Date().toISOString(),
  };
  await fs.writeFile(META_PATH, JSON.stringify(meta, null, 2), 'utf8');

  // eslint-disable-next-line no-console
  console.log(`[e2e setup] created test user ${email} (${user.id})`);
}
