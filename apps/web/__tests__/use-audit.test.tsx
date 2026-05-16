import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const { fetchAudit } = vi.hoisted(() => ({ fetchAudit: vi.fn() }));
vi.mock('@/lib/api/audits', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/audits')>()),
  fetchAudit,
}));

import { useAudit } from '@/lib/query/use-audit';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useAudit', () => {
  it('fetches the audit by id', async () => {
    fetchAudit.mockResolvedValue({ id: 'a1', title: 'R' });
    const { result } = renderHook(() => useAudit('a1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe('a1');
    expect(fetchAudit).toHaveBeenCalledWith('a1');
  });

  it('is disabled when id is empty', () => {
    fetchAudit.mockClear();
    const { result } = renderHook(() => useAudit(''), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchAudit).not.toHaveBeenCalled();
  });
});
