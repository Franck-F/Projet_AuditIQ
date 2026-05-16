import { describe, expect, it, vi } from 'vitest';

const getSession = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { getSession } }),
}));

describe('api client', () => {
  it('injects the Supabase access token as a Bearer header', async () => {
    getSession.mockResolvedValue({
      data: { session: { access_token: 'jwt-123' } },
    });
    const { api } = await import('@/lib/api/client');
    const handler = (
      api.interceptors.request as unknown as {
        handlers: { fulfilled: (c: unknown) => Promise<{ headers: Record<string, string> }> }[];
      }
    ).handlers[0]!;
    const req = await handler.fulfilled({ headers: {} });
    expect(req.headers.Authorization).toBe('Bearer jwt-123');
  });

  it('sends no Authorization header when there is no session', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    const { api } = await import('@/lib/api/client');
    const handler = (
      api.interceptors.request as unknown as {
        handlers: { fulfilled: (c: unknown) => Promise<{ headers: Record<string, string> }> }[];
      }
    ).handlers[0]!;
    const req = await handler.fulfilled({ headers: {} });
    expect(req.headers.Authorization).toBeUndefined();
  });
});
