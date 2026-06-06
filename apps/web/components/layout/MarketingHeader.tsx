'use client';

import * as React from 'react';
import Link from 'next/link';
import { ShieldCheck, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/components/app/ThemeProvider';

export function MarketingHeader() {
  const { theme, toggle } = useTheme();

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
          <Link href="/#produit">Pourquoi AuditIQ</Link>
          <Link href="/#modules">Modules</Link>
          <Link href="/#tarifs">Tarifs</Link>
          <Link href="/#conformite">AI Act</Link>
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
          <Link className="btn btn-ghost" href="/connexion">
            Connexion
          </Link>
          <Link className="btn btn-primary" href="/inscription">
            Essayer gratuitement
          </Link>
        </div>
      </div>
    </nav>
  );
}
