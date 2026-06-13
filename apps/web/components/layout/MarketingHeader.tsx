'use client';

import * as React from 'react';
import Link from 'next/link';
import { ShieldCheck, Sun, Moon, Menu, X } from 'lucide-react';
import { useTheme } from '@/components/app/ThemeProvider';

const NAV_LINKS = [
  { href: '/#produit', label: 'Pourquoi AuditIQ' },
  { href: '/#modules', label: 'Modules' },
  { href: '/#tarifs', label: 'Tarifs' },
  { href: '/#conformite', label: 'AI Act' },
] as const;

export function MarketingHeader() {
  const { theme, toggle } = useTheme();
  const [open, setOpen] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  // Close on Escape + lightweight focus trap while the drawer is open.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    // Move focus into the panel for keyboard users.
    panelRef.current?.querySelector<HTMLElement>('a, button')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <nav className="nav" aria-label="Navigation principale">
      <div className="nav-in">
        <Link className="brand" href="#top" aria-label="AuditIQ — retour à l'accueil">
          <span className="brand-logo" aria-hidden="true">
            <ShieldCheck size={17} strokeWidth={1.7} />
          </span>
          <span className="brand-name">AuditIQ</span>
        </Link>

        <div className="nav-links">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
        </div>

        <div className="nav-right">
          <button
            type="button"
            className="icon-btn"
            title="Changer de thème"
            aria-label="Changer de thème"
            onClick={toggle}
          >
            {theme === 'dark' ? <Sun size={17} strokeWidth={1.7} /> : <Moon size={17} strokeWidth={1.7} />}
          </button>
          <Link className="btn btn-ghost nav-desktop-only" href="/connexion">
            Connexion
          </Link>
          <Link className="btn btn-primary nav-desktop-only" href="/inscription">
            Essayer gratuitement
          </Link>

          <button
            type="button"
            ref={triggerRef}
            className="icon-btn nav-burger"
            aria-label="Ouvrir le menu"
            aria-expanded={open}
            aria-controls="mobile-nav-panel"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={18} strokeWidth={1.8} /> : <Menu size={18} strokeWidth={1.8} />}
          </button>
        </div>
      </div>

      {open && (
        <>
          <button
            type="button"
            className="nav-scrim"
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
          />
          <div
            id="mobile-nav-panel"
            ref={panelRef}
            className="nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navigation"
          >
            <div className="nav-drawer-links">
              {NAV_LINKS.map((l) => (
                <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>
                  {l.label}
                </Link>
              ))}
            </div>
            <div className="nav-drawer-cta">
              <Link className="btn btn-outline" href="/connexion" onClick={() => setOpen(false)}>
                Connexion
              </Link>
              <Link className="btn btn-primary" href="/inscription" onClick={() => setOpen(false)}>
                Essayer gratuitement
              </Link>
            </div>
          </div>
        </>
      )}
    </nav>
  );
}
