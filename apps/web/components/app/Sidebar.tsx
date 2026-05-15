'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  Activity,
  FileText,
  Lightbulb,
  ScrollText,
  Layers,
  MessageSquareCode,
  Users,
  Settings,
  HelpCircle,
  Plus,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type NavItem =
  | { type: 'section'; label: string }
  | { type: 'item'; key: string; label: string; href: string; icon: LucideIcon; count?: number };

const NAV: NavItem[] = [
  { type: 'section', label: 'Espace de travail' },
  { type: 'item', key: 'dashboard', label: "Vue d'ensemble", href: '/app', icon: LayoutGrid },
  { type: 'item', key: 'audits', label: 'Audits', href: '/app/audits', icon: Activity, count: 12 },
  { type: 'item', key: 'rapports', label: 'Rapports', href: '/app/rapports', icon: FileText },
  {
    type: 'item',
    key: 'recos',
    label: 'Recommandations',
    href: '/app/recommandations',
    icon: Lightbulb,
    count: 8,
  },

  { type: 'section', label: "Modules d'audit" },
  { type: 'item', key: 'm1', label: 'M1 — Audit supervisé', href: '/app/audits/nouveau?module=M1', icon: ScrollText },
  { type: 'item', key: 'm2', label: 'M2 — Non supervisé', href: '/app/audits/nouveau?module=M2', icon: Layers },
  { type: 'item', key: 'm3', label: 'M3 — Audit LLM', href: '/app/audits/nouveau?module=M3', icon: MessageSquareCode },

  { type: 'section', label: 'Organisation' },
  { type: 'item', key: 'equipe', label: 'Équipe & permissions', href: '/app/equipe', icon: Users },
  { type: 'item', key: 'parametres', label: 'Paramètres', href: '/app/parametres/entreprise', icon: Settings },
  { type: 'item', key: 'support', label: 'Aide & support', href: '/app/support', icon: HelpCircle },
];

function isActive(pathname: string, href: string): boolean {
  const cleanHref = href.split('?')[0]!;
  if (cleanHref === '/app') return pathname === '/app';
  return pathname === cleanHref || pathname.startsWith(`${cleanHref}/`);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="sticky top-0 flex h-screen flex-col overflow-y-auto border-r border-border-subtle bg-surface"
      style={{ width: 'var(--sidebar-w)' }}
      aria-label="Navigation principale"
    >
      {/* Brand */}
      <Link
        href="/app"
        className="flex items-center gap-2.5 border-b border-border-subtle px-5 py-4 font-display text-h4 font-semibold tracking-tight text-fg"
      >
        <span
          className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-accent text-[#0b1410] font-mono font-semibold text-sm leading-none"
          aria-hidden
        >
          A
        </span>
        AuditIQ
      </Link>

      {/* Workspace switcher (mock) */}
      <button
        type="button"
        className="mx-3 mt-3 flex items-center gap-2.5 rounded-md border border-border-subtle bg-surface-2 px-3 py-2.5 text-left transition-colors hover:border-border-default"
      >
        <span
          aria-hidden
          className="inline-flex size-7 items-center justify-center rounded-md bg-[linear-gradient(135deg,oklch(54%_0.12_270),oklch(48%_0.10_200))] font-mono text-xs font-semibold text-[#fafafa]"
        >
          TS
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium leading-tight">Cabinet Tessier</div>
          <div className="text-[11px] uppercase tracking-wider text-fg-muted">
            Plan Équipe · 5 sièges
          </div>
        </div>
        <ChevronDown size={12} className="text-fg-muted" aria-hidden />
      </button>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
        {NAV.map((entry, i) => {
          if (entry.type === 'section') {
            return (
              <div
                key={`section-${i}`}
                className="mt-3.5 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider text-fg-muted"
              >
                {entry.label}
              </div>
            );
          }
          const Icon = entry.icon;
          const active = isActive(pathname, entry.href);
          return (
            <Link
              key={entry.key}
              href={entry.href}
              className={cn(
                'relative flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm transition-colors',
                active
                  ? 'bg-surface-2 text-fg'
                  : 'text-fg-secondary hover:bg-surface-2 hover:text-fg',
              )}
              aria-current={active ? 'page' : undefined}
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute -left-3 top-2 bottom-2 w-[2px] rounded bg-accent"
                />
              )}
              <Icon
                size={16}
                strokeWidth={1.75}
                className={active ? 'text-accent' : 'text-fg-muted'}
              />
              <span className="flex-1 truncate">{entry.label}</span>
              {entry.count != null && (
                <span className="rounded-sm border border-border-subtle bg-bg px-1.5 py-px font-mono text-[11px] tabular-nums text-fg-muted">
                  {entry.count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="flex flex-col gap-2 border-t border-border-subtle p-3">
        <Link
          href="/app/audits/nouveau"
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-[#0b1410] transition-colors hover:bg-accent-hover"
        >
          <Plus size={14} strokeWidth={2} aria-hidden />
          Lancer un audit
        </Link>
        <button
          type="button"
          className="flex items-center gap-2.5 rounded-sm p-2 text-left transition-colors hover:bg-surface-2"
        >
          <span
            aria-hidden
            className="inline-flex size-7 items-center justify-center rounded-full border border-border-subtle bg-surface-3 font-mono text-[11px] text-fg"
          >
            CT
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm leading-tight">Claire Tessier</div>
            <div className="text-[11px] text-fg-muted">Responsable conformité</div>
          </div>
        </button>
      </div>
    </aside>
  );
}
