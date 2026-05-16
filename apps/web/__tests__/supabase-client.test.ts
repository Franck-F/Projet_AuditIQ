import { describe, expect, it, vi } from 'vitest';

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn((url: string, key: string) => ({ url, key })),
}));

describe('supabase browser client', () => {
  it('is constructed from public env', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://proj.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'pk_test');
    const { createClient } = await import('@/lib/supabase/client');
    const c = createClient() as unknown as { url: string; key: string };
    expect(c.url).toBe('https://proj.supabase.co');
    expect(c.key).toBe('pk_test');
  });
});
