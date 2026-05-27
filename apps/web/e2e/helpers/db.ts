/** node-postgres connection to Supabase (used only by global-teardown).
 *  Parses SUPABASE_DB_URL manually so that passwords containing characters
 *  with URL-reserved meaning (notably `@`, `:`, `/`) don't break Node's
 *  WHATWG URL parser. Strips the SQLAlchemy `+asyncpg` adapter prefix since
 *  node-postgres consumes plain `postgresql://` / `postgres://`. */
import { Client, type ClientConfig } from 'pg';

function dbConfig(): ClientConfig {
  const raw = process.env.SUPABASE_DB_URL;
  if (!raw) throw new Error('SUPABASE_DB_URL not set in e2e/.env.e2e');
  const noScheme = raw
    .replace(/^postgresql\+asyncpg:\/\//, '')
    .replace(/^postgresql:\/\//, '')
    .replace(/^postgres:\/\//, '');
  // userinfo@hostport[/db][?params] — split on the LAST `@` so passwords
  // containing `@` round-trip safely.
  const lastAt = noScheme.lastIndexOf('@');
  if (lastAt < 0) throw new Error('SUPABASE_DB_URL: missing @ between userinfo and host');
  const userinfo = noScheme.slice(0, lastAt);
  const hostInfo = noScheme.slice(lastAt + 1);

  const firstColon = userinfo.indexOf(':');
  if (firstColon < 0) throw new Error('SUPABASE_DB_URL: missing user:password separator');
  const user = decodeURIComponent(userinfo.slice(0, firstColon));
  const password = decodeURIComponent(userinfo.slice(firstColon + 1));

  const slashIdx = hostInfo.indexOf('/');
  const hostPort = slashIdx >= 0 ? hostInfo.slice(0, slashIdx) : hostInfo;
  const afterSlash = slashIdx >= 0 ? hostInfo.slice(slashIdx + 1) : '';
  const [host, portStr] = hostPort.split(':');
  const database = afterSlash.split('?')[0] || 'postgres';
  const port = portStr ? Number(portStr) : 5432;

  return {
    user,
    password,
    host,
    port,
    database,
    ssl: { rejectUnauthorized: false },
  };
}

export async function withClient<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const client = new Client(dbConfig());
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
      // Delete in FK-respectful order: reports → audit_results → audits
      // (both reports and audit_results have FK on audits.id).
      await c.query(
        `delete from reports where audit_id in
           (select id from audits where org_id = $1)`,
        [orgId],
      );
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
    console.warn('[e2e teardown] cleanupUserData failed (best-effort):', err);
  }
}
