import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({ auth: { getUser } })),
}));

import { proxy } from '@/proxy';

function req(path: string) {
  return new NextRequest(`http://localhost${path}`);
}

describe('proxy auth gate', () => {
  it('redirects unauthenticated /app to /connexion', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await proxy(req('/app'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/connexion');
  });

  it('lets an authenticated user through to /app', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    const res = await proxy(req('/app'));
    expect(res.status).toBe(200);
  });

  it('never gates public routes', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await proxy(req('/tarifs'));
    expect(res.status).toBe(200);
  });
});
