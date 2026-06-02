'use client';

import * as React from 'react';
import Link from 'next/link';

import { Icons } from '@/components/ui/icons';

interface Crumb {
  label: string;
  href?: string;
}

interface TopbarProps {
  crumbs?: ReadonlyArray<Crumb>;
  searchPlaceholder?: string;
  onSearch?: (q: string) => void;
}

export function Topbar({
  crumbs = [],
  searchPlaceholder = 'Rechercher un audit, une page…',
  onSearch,
}: TopbarProps): React.ReactElement {
  return (
    <div className="topbar">
      <nav aria-label="Fil d'Ariane" style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        {crumbs.map((c, idx) => {
          const isLast = idx === crumbs.length - 1;
          return (
            <React.Fragment key={`${c.label}-${idx}`}>
              {idx > 0 && <Icons.chevronDown size={14} style={{ transform: 'rotate(-90deg)', color: 'var(--fg-muted)' }} />}
              {c.href && !isLast ? (
                <Link href={c.href} style={{ color: 'var(--fg-muted)', fontSize: 13 }}>{c.label}</Link>
              ) : (
                <span style={{ color: isLast ? 'var(--fg)' : 'var(--fg-muted)', fontSize: 13, fontWeight: isLast ? 500 : 400 }}>{c.label}</span>
              )}
            </React.Fragment>
          );
        })}
      </nav>

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
      </div>
    </div>
  );
}
