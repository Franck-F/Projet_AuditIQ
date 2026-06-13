'use client';

import * as React from 'react';

import { Sidebar } from './Sidebar';
import { SidebarContext } from './SidebarContext';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = React.useState(false);

  // Close the mobile drawer on Escape.
  React.useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNavOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [navOpen]);

  const value = React.useMemo(
    () => ({ navOpen, openNav: () => setNavOpen(true), closeNav: () => setNavOpen(false) }),
    [navOpen],
  );

  return (
    <SidebarContext.Provider value={value}>
      <div className={`shell${navOpen ? ' shell-nav-open' : ''}`}>
        {navOpen && (
          <button
            type="button"
            className="shell-scrim"
            aria-label="Fermer le menu"
            onClick={() => setNavOpen(false)}
          />
        )}
        <Sidebar />
        <div className="main">{children}</div>
      </div>
    </SidebarContext.Provider>
  );
}
