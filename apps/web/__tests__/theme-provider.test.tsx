import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ThemeProvider, useTheme } from '@/components/app/ThemeProvider';

function ProbeButton() {
  const { theme, toggle } = useTheme();
  return (
    <button onClick={toggle} data-testid="probe">
      {theme}
    </button>
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    // Mock localStorage with a simple in-memory implementation
    const store: Record<string, string> = {};

    const localStorageMock = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { Object.keys(store).forEach(k => delete store[k]); },
      key: (index: number) => Object.keys(store)[index] ?? null,
      get length() { return Object.keys(store).length; },
    };

    vi.stubGlobal('localStorage', localStorageMock);
    // matchMedia: no OS dark preference unless a test overrides it.
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
    document.documentElement.removeAttribute('data-theme');
  });

  it('defaults to light when no localStorage value and no OS dark preference', () => {
    render(<ThemeProvider><ProbeButton /></ThemeProvider>);
    expect(screen.getByTestId('probe').textContent).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('follows prefers-color-scheme: dark when no stored value', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
    render(<ThemeProvider><ProbeButton /></ThemeProvider>);
    expect(screen.getByTestId('probe').textContent).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('hydrates from localStorage if present (overrides OS preference)', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
    localStorage.setItem('aiq-theme', 'light');
    render(<ThemeProvider><ProbeButton /></ThemeProvider>);
    expect(screen.getByTestId('probe').textContent).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('toggle switches light→dark→light and persists', async () => {
    render(<ThemeProvider><ProbeButton /></ThemeProvider>);
    const user = userEvent.setup();
    await user.click(screen.getByTestId('probe'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('aiq-theme')).toBe('dark');
    await user.click(screen.getByTestId('probe'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('aiq-theme')).toBe('light');
  });

  it('useTheme throws outside provider', () => {
    expect(() => render(<ProbeButton />)).toThrow(/ThemeProvider/i);
  });
});
