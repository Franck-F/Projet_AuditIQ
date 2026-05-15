'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Container } from './Container';
import { BrandMark } from './BrandMark';
import { Button } from '@/components/ui/button';

interface NavItem {
  key: string;
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'produit', label: 'Produit', href: '/produit' },
  { key: 'modules', label: 'Modules', href: '/modules' },
  { key: 'cas-usage', label: "Cas d'usage", href: '/cas-usage' },
  { key: 'ai-act', label: 'AI Act', href: '/ai-act' },
  { key: 'tarifs', label: 'Tarifs', href: '/tarifs' },
  { key: 'ressources', label: 'Ressources', href: '/ressources' },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MarketingHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <nav
      className="sticky top-0 z-50 h-[var(--nav-h)] bg-surface-glass backdrop-blur-md border-b border-border-subtle"
      aria-label="Navigation principale"
    >
      <Container className="flex h-full items-center justify-between gap-8">
        <BrandMark />

        <div className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  'px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150',
                  active
                    ? 'text-fg bg-surface-2'
                    : 'text-fg-secondary hover:text-fg hover:bg-surface-2',
                )}
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <Button asChild variant="ghost" size="sm">
            <Link href="/connexion">Connexion</Link>
          </Button>
          <Button asChild variant="primary" size="sm">
            <Link href="/contact">Demander une démo</Link>
          </Button>
        </div>

        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border-default text-fg-secondary hover:text-fg hover:bg-surface-2 lg:hidden"
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          onClick={() => setMobileOpen((o) => !o)}
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </Container>

      {mobileOpen && (
        <div
          id="mobile-nav"
          className="lg:hidden border-t border-border-subtle bg-surface"
          role="dialog"
        >
          <Container className="flex flex-col gap-1 py-4">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={cn(
                    'px-3 py-2.5 text-sm font-medium rounded-md',
                    active ? 'text-fg bg-surface-2' : 'text-fg-secondary',
                  )}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-border-subtle pt-3">
              <Button asChild variant="secondary" size="sm">
                <Link href="/connexion">Connexion</Link>
              </Button>
              <Button asChild variant="primary" size="sm">
                <Link href="/contact">Démo</Link>
              </Button>
            </div>
          </Container>
        </div>
      )}
    </nav>
  );
}
