import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Sidebar } from '@/components/app/Sidebar';
import { ThemeProvider } from '@/components/app/ThemeProvider';

vi.mock('next/navigation', () => ({
  usePathname: () => '/app',
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { email: 'u@x.fr' } }, error: null }),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  }),
}));

beforeEach(() => {
  // Ensure localStorage is functional in this environment
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.clear();
    } catch {
      // If localStorage is not writable/functional, replace with in-memory mock
      const store: Record<string, string> = {};
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: (key: string) => store[key] ?? null,
          setItem: (key: string, value: string) => { store[key] = value; },
          removeItem: (key: string) => { delete store[key]; },
          clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
          get length() { return Object.keys(store).length; },
          key: (i: number) => Object.keys(store)[i] ?? null,
        },
        writable: true,
        configurable: true,
      });
    }
    document.documentElement.removeAttribute('data-theme');
  }
});

function wrap(children: React.ReactNode) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('Sidebar (refonte)', () => {
  it('renders the brand block (logo + name)', () => {
    render(wrap(<Sidebar />));
    expect(screen.getByText(/AuditIQ/i)).toBeInTheDocument();
  });

  it('renders nav sections (Espace de travail, Organisation)', () => {
    render(wrap(<Sidebar />));
    expect(screen.getByText(/Espace de travail/i)).toBeInTheDocument();
    expect(screen.getByText(/Organisation/i)).toBeInTheDocument();
  });

  it("renders nav items (Vue d'ensemble, Audits, Rapports, Recommandations)", () => {
    render(wrap(<Sidebar />));
    expect(screen.getByText(/Vue d.ensemble/i)).toBeInTheDocument();
    expect(screen.getByText(/Audits/)).toBeInTheDocument();
    expect(screen.getByText(/Rapports/)).toBeInTheDocument();
    expect(screen.getByText(/Recommandations/)).toBeInTheDocument();
  });

  it('renders theme toggle and switches data-theme on click', async () => {
    render(wrap(<Sidebar />));
    const toggle = screen.getByRole('button', { name: /th[èe]me/i });
    expect(toggle).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(toggle);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
