import fs from 'node:fs/promises';
import path from 'node:path';
import type { FullConfig } from '@playwright/test';
import { adminDeleteUser } from './helpers/supabase';
import { cleanupUserData } from './helpers/db';

const META_PATH = path.resolve(__dirname, '.auth/meta.json');

interface Meta {
  user_id: string;
  email: string;
}

export default async function globalTeardown(_config: FullConfig): Promise<void> {
  let meta: Meta | null = null;
  try {
    const raw = await fs.readFile(META_PATH, 'utf8');
    meta = JSON.parse(raw) as Meta;
  } catch {
    // eslint-disable-next-line no-console
    console.warn('[e2e teardown] no meta.json — nothing to clean');
    return;
  }

  await cleanupUserData(meta.user_id);
  await adminDeleteUser(meta.user_id);

  // best-effort: remove auth artefacts so the next run starts fresh
  try {
    await fs.rm(path.dirname(META_PATH), { recursive: true, force: true });
  } catch {
    /* ignore */
  }
  // eslint-disable-next-line no-console
  console.log(`[e2e teardown] removed test user ${meta.email} (${meta.user_id})`);
}
