import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { signInWithPassword, push } = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  push: vi.fn(),
}));
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { signInWithPassword } }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

import ConnexionPage from '@/app/(auth)/connexion/page';
import { ThemeProvider } from '@/components/app/ThemeProvider';

function Wrapped() {
  return <ThemeProvider><ConnexionPage /></ThemeProvider>;
}

beforeEach(() => {
  const store: Record<string, string> = {};
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() { return Object.keys(store).length; },
  });
});

describe('connexion', () => {
  it('signs in then redirects to /app', async () => {
    signInWithPassword.mockResolvedValue({ error: null });
    render(<Wrapped />);
    await userEvent.type(screen.getByLabelText(/e.?mail/i), 'claire@acme.fr');
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
    render(<Wrapped />);
    await userEvent.type(screen.getByLabelText(/e.?mail/i), 'x@y.fr');
    await userEvent.type(screen.getByLabelText(/mot de passe/i), 'bad');
    await userEvent.click(
      screen.getByRole('button', { name: /se connecter/i }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(/identifiants/i);
    expect(push).not.toHaveBeenCalled();
  });
});
