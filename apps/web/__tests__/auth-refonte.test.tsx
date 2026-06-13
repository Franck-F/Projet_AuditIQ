import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { AuthShell } from '@/components/auth/AuthShell';
import { ThemeProvider } from '@/components/app/ThemeProvider';

function Wrapped(props: React.ComponentProps<typeof AuthShell>) {
  return (
    <ThemeProvider>
      <AuthShell {...props} />
    </ThemeProvider>
  );
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

describe('AuthShell — R4 split-screen refonte', () => {
  it('renders the brand h2', () => {
    render(
      <Wrapped activeTab="login" heading="Content" intro="Accédez">
        <div>FORM</div>
      </Wrapped>,
    );
    expect(
      screen.getByText(/prouvez l'équité de vos modèles d'ia/i),
    ).toBeInTheDocument();
  });

  it('renders the hosting / RGPD trust badge', () => {
    render(
      <Wrapped activeTab="login" heading="Content" intro="Accédez">
        <div>FORM</div>
      </Wrapped>,
    );
    expect(screen.getByText(/hébergé en ue · rgpd/i)).toBeInTheDocument();
  });

  it('Connexion tab has aria-current=page when activeTab=login', () => {
    render(
      <Wrapped activeTab="login" heading="Content" intro="Accédez">
        <div>FORM</div>
      </Wrapped>,
    );
    const loginLink = screen.getByRole('link', { name: /connexion/i });
    expect(loginLink).toHaveAttribute('aria-current', 'page');
  });

  it('Créer un compte tab is a link to /inscription', () => {
    render(
      <Wrapped activeTab="login" heading="Content" intro="Accédez">
        <div>FORM</div>
      </Wrapped>,
    );
    const signupLink = screen.getByRole('link', { name: /créer un compte/i });
    expect(signupLink).toHaveAttribute('href', '/inscription');
    expect(signupLink).not.toHaveAttribute('aria-current', 'page');
  });

  it('theme toggle button has aria-label', () => {
    render(
      <Wrapped activeTab="login" heading="Content" intro="Accédez">
        <div>FORM</div>
      </Wrapped>,
    );
    expect(
      screen.getByRole('button', { name: /basculer le thème/i }),
    ).toBeInTheDocument();
  });

  it('renders children inside the form column', () => {
    render(
      <Wrapped activeTab="login" heading="Content" intro="Accédez">
        <div>FORM</div>
      </Wrapped>,
    );
    expect(screen.getByText('FORM')).toBeInTheDocument();
  });

  it('signup tab is active when activeTab=signup', () => {
    render(
      <Wrapped activeTab="signup" heading="Commencez" intro="14 jours">
        <div>FORM</div>
      </Wrapped>,
    );
    const signupLink = screen.getByRole('link', { name: /créer un compte/i });
    expect(signupLink).toHaveAttribute('aria-current', 'page');
    const loginLink = screen.getByRole('link', { name: /connexion/i });
    expect(loginLink).not.toHaveAttribute('aria-current', 'page');
  });
});
