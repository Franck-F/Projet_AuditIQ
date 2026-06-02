'use client';

import * as React from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'aiq-theme';

function readInitial(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'light' ? 'light' : 'dark';
}

export function ThemeProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [theme, setThemeState] = React.useState<Theme>(() => readInitial());

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = React.useCallback((t: Theme) => setThemeState(t), []);
  const toggle = React.useCallback(() => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')), []);

  const value = React.useMemo(() => ({ theme, toggle, setTheme }), [theme, toggle, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (ctx === null) {
    throw new Error('useTheme must be used inside a ThemeProvider');
  }
  return ctx;
}
