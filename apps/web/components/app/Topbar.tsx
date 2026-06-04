'use client';

import * as React from 'react';
import Link from 'next/link';

import { Icons } from '@/components/ui/icons';

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
}

export function Topbar({
  title,
  sub,
  crumbs = [],
  searchPlaceholder = 'Rechercher un audit, une page…',
  onSearch,
  actions,
}: TopbarProps): React.ReactElement {
  return (
    <div className="topbar">
      <div style={{ minWidth: 0 }}>
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
        <button type="button" className="icon-btn" aria-label="Notifications">
          <Icons.bell size={16} />
          <span className="icon-btn-dot" aria-hidden />
        </button>
        {actions && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
