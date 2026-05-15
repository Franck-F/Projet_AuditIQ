import * as React from 'react';
import Link from 'next/link';
import { Bell, Search } from 'lucide-react';

export interface Breadcrumb {
  label: string;
  href?: string;
}

interface TopbarProps {
  crumbs: Breadcrumb[];
  cta?: { label: string; href: string };
  notifications?: boolean;
}

export function Topbar({
  crumbs,
  cta = { label: 'Lancer un audit', href: '/app/audits/nouveau' },
  notifications = true,
}: TopbarProps) {
  return (
    <header
      className="sticky top-0 z-40 flex items-center gap-4 border-b border-border-subtle bg-surface-glass px-8 backdrop-blur-md"
      style={{ height: 'var(--topbar-h)' }}
    >
      <nav aria-label="Fil d'Ariane" className="flex items-center gap-2 text-sm text-fg-muted">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          if (last) {
            return (
              <span key={c.label} className="text-fg" aria-current="page">
                {c.label}
              </span>
            );
          }
          return (
            <React.Fragment key={c.label}>
              {c.href ? (
                <Link href={c.href} className="text-fg-secondary transition-colors hover:text-fg">
                  {c.label}
                </Link>
              ) : (
                <span className="text-fg-secondary">{c.label}</span>
              )}
              <span aria-hidden className="text-fg-disabled">
                /
              </span>
            </React.Fragment>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-2.5">
        <button
          type="button"
          className="hidden items-center gap-2 rounded-md border border-border-subtle bg-surface-2 px-2.5 py-1.5 text-sm text-fg-muted transition-colors hover:border-border-default md:flex md:w-[280px]"
          aria-label="Rechercher"
        >
          <Search size={14} strokeWidth={1.75} aria-hidden />
          <span>Rechercher un audit, un rapport…</span>
          <span className="ml-auto rounded border border-border-subtle bg-bg px-1.5 py-px font-mono text-[11px] text-fg-muted">
            ⌘K
          </span>
        </button>

        {notifications && (
          <Link
            href="/app/audits"
            aria-label="Notifications"
            title="Notifications"
            className="relative inline-flex size-8 items-center justify-center rounded-sm border border-border-subtle text-fg-secondary transition-colors hover:border-border-default hover:bg-surface-2 hover:text-fg"
          >
            <Bell size={16} strokeWidth={1.75} aria-hidden />
            <span
              aria-hidden
              className="absolute right-[6px] top-[6px] size-1.5 rounded-full border-[1.5px] border-surface bg-status-warn"
            />
          </Link>
        )}

        {cta && (
          <Link
            href={cta.href}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-xs font-medium text-[#0b1410] transition-colors hover:bg-accent-hover"
          >
            {cta.label}
          </Link>
        )}
      </div>
    </header>
  );
}
