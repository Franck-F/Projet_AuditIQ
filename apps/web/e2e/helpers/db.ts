/** node-postgres connection to Supabase (used only by global-teardown).
 *  Strips the `+asyncpg` SQLAlchemy adapter from the URL since node-postgres
 *  consumes plain `postgresql://`. */
import { Client } from 'pg';

const dbUrl = (): string => {
  const u = process.env.SUPABASE_DB_URL;
  if (!u) throw new Error('SUPABASE_DB_URL not set in e2e/.env.e2e');
  // postgresql+asyncpg://... -> postgresql://...
  return u.replace(/^postgresql\+asyncpg:\/\//, 'postgresql://');
};

export async function withClient<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const client = new Client({
    connectionString: dbUrl(),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

/** Mirrors the smoke harness cleanup: delete every row owned by the
 *  test user's org. Best-effort; logs but does not throw. */
export async function cleanupUserData(userId: string): Promise<void> {
  try {
    await withClient(async (c) => {
      const r = await c.query<{ org_id: string }>(
        'select org_id from users where id = $1',
        [userId],
      );
      const orgId = r.rows[0]?.org_id;
      if (!orgId) return;
      await c.query(
        `delete from audit_results where audit_id in
           (select id from audits where org_id = $1)`,
        [orgId],
      );
      for (const tbl of ['audits', 'datasets', 'users']) {
        await c.query(`delete from ${tbl} where org_id = $1`, [orgId]);
      }
      await c.query('delete from organizations where id = $1', [orgId]);
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[e2e teardown] cleanupUserData failed (best-effort):', err);
  }
}
