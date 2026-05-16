import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ api: { get } }));

import { useDashboard } from '@/lib/query/use-dashboard';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useDashboard', () => {
  it('returns the API summary', async () => {
    get.mockResolvedValue({
      data: {
        total_audits: 3,
        failing_audits: 1,
        warning_audits: 1,
        risk_score: 42,
        module_usage: { M1: 3 },
        recent_audits: [],
      },
    });
    const { result } = renderHook(() => useDashboard(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.total_audits).toBe(3);
    expect(get).toHaveBeenCalledWith('/dashboard/summary');
  });
});
