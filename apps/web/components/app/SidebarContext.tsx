'use client';

import * as React from 'react';

interface SidebarContextValue {
  /** Whether the mobile off-canvas drawer is open. */
  navOpen: boolean;
  openNav: () => void;
  closeNav: () => void;
}

/**
 * Shares the mobile sidebar (drawer) open-state between the AppShell, the
 * Sidebar and the Topbar's hamburger button. Defaults to a no-op so components
 * rendered outside the provider (e.g. in isolation tests) don't crash.
 */
export const SidebarContext = React.createContext<SidebarContextValue>({
  navOpen: false,
  openNav: () => {},
  closeNav: () => {},
});

export function useSidebar(): SidebarContextValue {
  return React.useContext(SidebarContext);
}
