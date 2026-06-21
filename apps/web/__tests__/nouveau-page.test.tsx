import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { push } = vi.hoisted(() => ({
  push: vi.fn(),
}));
vi.mock('@/lib/api/audits', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/audits')>()),
  uploadDataset: vi.fn(),
  createAudit: vi.fn(),
  analyzeDataset: vi.fn(),
  testConnectionM3: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

import NouveauPage from '@/app/app/audits/nouveau/page';

describe('audit wizard', () => {
  it('shows the unified wizard with audit type cards', async () => {
    render(<NouveauPage />);
    expect(await screen.findByRole('textbox', { name: /titre/i })).toBeInTheDocument();
    expect(screen.getByText('Une caractéristique sensible à tester')).toBeInTheDocument();
    expect(screen.getByText('Un chatbot à auditer')).toBeInTheDocument();
  });
});
