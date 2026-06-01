import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type Mock, describe, expect, it, vi } from 'vitest';

const { uploadDataset, createAudit, push } = vi.hoisted(() => ({
  uploadDataset: vi.fn(),
  createAudit: vi.fn(),
  push: vi.fn(),
}));
vi.mock('@/lib/api/audits', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/audits')>()),
  uploadDataset,
  createAudit,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

import NouveauPage from '@/app/app/audits/nouveau/page';

describe('audit wizard', () => {
  it('M1 module choice shows the new wizard (step 1: title input)', async () => {
    const user = userEvent.setup();
    render(<NouveauPage />);
    await user.click(screen.getByRole('button', { name: /Audit supervisé/i }));
    // New wizard: Step 1 shows the title field, plus step indicators
    expect(screen.getByRole('textbox', { name: /titre/i })).toBeInTheDocument();
    // Step 4 fields should NOT be visible at step 1
    expect(screen.queryByLabelText(/Attribut protégé/i)).toBeNull();
  });

  it('M2 module choice shows the new wizard (step 1: title input)', async () => {
    const user = userEvent.setup();
    render(<NouveauPage />);
    await user.click(screen.getByRole('button', { name: /Détection non supervisée/i }));
    expect(screen.getByRole('textbox', { name: /titre/i })).toBeInTheDocument();
    // Step 4 advanced not visible at step 1
    expect(screen.queryByLabelText(/Nombre de clusters/i)).toBeNull();
  });

  it('M3: choose module, fill target form (no CSV), creates an M3 audit', async () => {
    const user = userEvent.setup();
    (uploadDataset as unknown as Mock).mockClear();
    (createAudit as unknown as Mock).mockResolvedValueOnce({ id: 'm3-1' });
    render(<NouveauPage />);

    await user.click(
      screen.getByRole('button', { name: /chatbot|llm/i }),
    );

    await user.type(screen.getByLabelText(/titre/i), 'Chatbot RH');
    await user.type(
      screen.getByLabelText(/url/i),
      'https://api.example.com/v1',
    );
    // body_template + response_path are prefilled by the default
    // "OpenAI-compatible" preset; assert that preset's response_path below.
    expect(
      (screen.getByLabelText(/corps de requête/i) as HTMLTextAreaElement)
        .value,
    ).toContain('{prompt}');
    await user.click(
      screen.getByRole('button', { name: /lancer l'audit/i }),
    );

    await waitFor(() =>
      expect(createAudit as unknown as Mock).toHaveBeenCalled(),
    );
    const body = (createAudit as unknown as Mock).mock.calls.at(-1)![0];
    expect(body.module).toBe('M3');
    expect(body.target.url).toBe('https://api.example.com/v1');
    expect(body.target.response_path).toBe('choices.0.message.content');
    expect(body.lang).toBeTruthy();
    expect(uploadDataset as unknown as Mock).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith('/app/audits/m3-1');
  });
});
