'use client';

import * as React from 'react';
import Link from 'next/link';

import { Icons } from '@/components/ui/icons';
import { NotificationsPopover } from '@/components/app/NotificationsPopover';
import { useSidebar } from '@/components/app/SidebarContext';

interface Crumb {
  label: string;
  href?: string;
}

interface TopbarProps {
  /** Optional page title rendered as h1 (21px) below the breadcrumbs. */
  title?: string;
  /** Optional element rendered to the right of the title (e.g. a Badge). */
  sub?: React.ReactNode;
  crumbs?: ReadonlyArray<Crumb>;
  searchPlaceholder?: string;
  onSearch?: (q: string) => void;
  actions?: React.ReactNode;
  /** Widen the topbar content to the dense-workspace width (matches `.page.workspace`). */
  wide?: boolean;
}

export function Topbar({
  title,
  sub,
  crumbs = [],
  searchPlaceholder = 'Rechercher un audit, une page…',
  onSearch,
  actions,
  wide = false,
}: TopbarProps): React.ReactElement {
  const { navOpen, openNav } = useSidebar();
  return (
    <div className="topbar">
      <div className={`topbar-inner${wide ? ' workspace' : ''}`}>
        <button
          type="button"
          className="topbar-burger icon-btn"
          aria-label="Ouvrir le menu"
          aria-expanded={navOpen}
          aria-controls="app-sidebar"
          onClick={openNav}
        >
          <Icons.menu size={18} />
        </button>
        <div style={{ minWidth: 0, flex: 1 }}>
        {crumbs.length > 0 && (
          <nav
            aria-label="Fil d'Ariane"
            className="mono"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              fontSize: 11.5,
              color: 'var(--fg-muted)',
              marginBottom: title ? 5 : 0,
            }}
          >
            {crumbs.map((c, idx) => {
              const isLast = idx === crumbs.length - 1;
              return (
                <React.Fragment key={`${c.label}-${idx}`}>
                  {idx > 0 && (
                    <Icons.chevronDown size={12} style={{ transform: 'rotate(-90deg)', color: 'var(--fg-disabled)' }} />
                  )}
                  {c.href && !isLast ? (
                    <Link href={c.href} style={{ color: 'var(--fg-muted)' }}>
                      {c.label}
                    </Link>
                  ) : (
                    <span style={{ color: isLast ? 'var(--fg-secondary)' : 'var(--fg-muted)' }}>{c.label}</span>
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        )}
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontSize: 21, letterSpacing: '-0.025em', fontWeight: 600, margin: 0 }}>{title}</h1>
            {sub}
          </div>
        )}
      </div>

      <div className="topbar-actions">
        <div className="searchbox">
          <Icons.search size={15} />
          <input
            type="search"
            placeholder={searchPlaceholder}
            onChange={(e) => onSearch?.(e.target.value)}
            aria-label="Rechercher"
          />
          <span className="searchbox-kbd mono">⌘ K</span>
        </div>
        <NotificationsPopover />

        {actions && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {actions}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
