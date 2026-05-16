import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const { signInWithPassword, push } = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  push: vi.fn(),
}));
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { signInWithPassword } }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

import ConnexionPage from '@/app/(auth)/connexion/page';

describe('connexion', () => {
  it('signs in then redirects to /app', async () => {
    signInWithPassword.mockResolvedValue({ error: null });
    render(<ConnexionPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'claire@acme.fr');
    await userEvent.type(screen.getByLabelText(/mot de passe/i), 'secret123');
    await userEvent.click(
      screen.getByRole('button', { name: /se connecter/i }),
    );
    await waitFor(() =>
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: 'claire@acme.fr',
        password: 'secret123',
      }),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith('/app'));
  });

  it('shows an error message on invalid credentials', async () => {
    signInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    });
    push.mockClear();
    render(<ConnexionPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'x@y.fr');
    await userEvent.type(screen.getByLabelText(/mot de passe/i), 'bad');
    await userEvent.click(
      screen.getByRole('button', { name: /se connecter/i }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(/identifiants/i);
    expect(push).not.toHaveBeenCalled();
  });
});
