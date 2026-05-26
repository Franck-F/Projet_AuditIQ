/** Thin Supabase REST helpers used by global-setup / global-teardown.
 *  Mirrors the smoke harness pattern (admin-create with service role,
 *  password grant with publishable/anon key, delete user by id). */
export interface CreatedUser {
  id: string;
  email: string;
}

export interface SessionTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type: string;
  user: { id: string; email: string };
}

const supabaseUrl = (): string => {
  const u = process.env.SUPABASE_URL;
  if (!u) throw new Error('SUPABASE_URL not set in e2e/.env.e2e');
  return u.replace(/\/+$/, '');
};

const serviceRole = (): string => {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!k) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set');
  return k;
};

const publishable = (): string => {
  const k =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!k) throw new Error('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or ANON_KEY) not set');
  return k;
};

export async function adminCreateUser(
  email: string,
  password: string,
): Promise<CreatedUser> {
  const key = serviceRole();
  const r = await fetch(`${supabaseUrl()}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!r.ok) {
    throw new Error(
      `admin create user failed: ${r.status} ${await r.text().catch(() => '')}`,
    );
  }
  const data = (await r.json()) as { id: string; email: string };
  return { id: data.id, email: data.email };
}

export async function passwordGrant(
  email: string,
  password: string,
): Promise<SessionTokens> {
  const key = publishable();
  const r = await fetch(
    `${supabaseUrl()}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        apikey: key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    },
  );
  if (!r.ok) {
    throw new Error(
      `password grant failed: ${r.status} ${await r.text().catch(() => '')}`,
    );
  }
  return (await r.json()) as SessionTokens;
}

export async function adminDeleteUser(userId: string): Promise<void> {
  const key = serviceRole();
  const r = await fetch(
    `${supabaseUrl()}/auth/v1/admin/users/${encodeURIComponent(userId)}`,
    {
      method: 'DELETE',
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    },
  );
  if (!r.ok && r.status !== 404) {
    // best-effort; do not throw from teardown
    console.warn(
      `[e2e teardown] adminDeleteUser ${userId}: ${r.status} ${await r.text().catch(() => '')}`,
    );
  }
}

/** Project ref extracted from SUPABASE_URL — used to build the
 *  Supabase localStorage key `sb-<ref>-auth-token` that the browser
 *  client expects. */
export function projectRef(): string {
  const host = new URL(supabaseUrl()).host;
  const ref = host.split('.')[0];
  if (!ref) throw new Error(`cannot derive project ref from ${host}`);
  return ref;
}
