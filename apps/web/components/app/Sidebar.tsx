'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { Icons } from '@/components/ui/icons';
import { useTheme } from '@/components/app/ThemeProvider';
import { createClient } from '@/lib/supabase/client';

/** Local-part of an email, capped to fit a 2-letter avatar. */
function initialsFrom(emailOrName: string): string {
  if (!emailOrName) return '??';
  const parts = emailOrName.trim().split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0]! + parts[1][0]!).toUpperCase();
  }
  const local = emailOrName.split('@')[0] ?? '';
  return (local.slice(0, 2) || '??').toUpperCase();
}

/** Derive a human-readable org name from the email domain. */
function orgNameFromEmail(email: string): string {
  const domain = email.split('@')[1];
  return domain || 'Organisation';
}

interface SessionUser {
  email: string;
  name?: string;
}

type NavEntry =
  | { type: 'section'; label: string }
  | { type: 'item'; key: string; label: string; href: string; icon: React.FC<{ size?: number }> };

const NAV: NavEntry[] = [
  { type: 'section' as const, label: 'Espace de travail' },
  { type: 'item' as const, key: 'dashboard', label: "Vue d'ensemble", href: '/app', icon: Icons.home },
  { type: 'item' as const, key: 'audits', label: 'Audits', href: '/app/audits', icon: Icons.activity },
  { type: 'item' as const, key: 'rapports', label: 'Rapports', href: '/app/rapports', icon: Icons.fileText },
  { type: 'item' as const, key: 'recos', label: 'Recommandations', href: '/app/recommandations', icon: Icons.lightbulb },
  { type: 'section' as const, label: 'Organisation' },
  { type: 'item' as const, key: 'equipe', label: 'Équipe & accès', href: '/app/equipe', icon: Icons.users },
  { type: 'item' as const, key: 'parametres', label: 'Paramètres', href: '/app/parametres', icon: Icons.settings },
  { type: 'item' as const, key: 'support', label: 'Aide & support', href: '/app/support', icon: Icons.helpCircle },
];

function isActive(pathname: string, href: string): boolean {
  const cleanHref = href.split('?')[0]!;
  if (cleanHref === '/app') return pathname === '/app';
  return pathname === cleanHref || pathname.startsWith(`${cleanHref}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [user, setUser] = React.useState<SessionUser | null>(null);

  React.useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    void supabase.auth.getUser().then(({ data }) => {
      if (cancelled || !data.user?.email) return;
      const meta = (data.user.user_metadata ?? {}) as {
        full_name?: string;
        name?: string;
      };
      setUser({
        email: data.user.email,
        name: meta.full_name ?? meta.name,
      });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user?.email) {
        setUser(null);
        return;
      }
      const meta = (session.user.user_metadata ?? {}) as {
        full_name?: string;
        name?: string;
      };
      setUser({
        email: session.user.email,
        name: meta.full_name ?? meta.name,
      });
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/connexion');
  };

  const displayName = user?.name ?? user?.email ?? 'Chargement…';
  const orgName = user ? orgNameFromEmail(user.email) : '—';
  const initials = user ? initialsFrom(user.name ?? user.email) : '··';

  return (
    <aside className="sidebar" aria-label="Navigation principale">
      {/* Brand */}
      <div className="sb-brand">
        <Link href="/app" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}>
          <div className="sb-logo">
            <Icons.shield size={17} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-0.02em' }}>AuditIQ</div>
            <div className="eyebrow" style={{ fontSize: 9.5, letterSpacing: '0.14em' }}>FAIRNESS PLATFORM</div>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="sb-nav">
        {NAV.map((entry, i) => {
          if (entry.type === 'section') {
            return (
              <div key={`section-${i}`} className="sb-group">
                <div className="sb-section">{entry.label}</div>
              </div>
            );
          }
          const Icon = entry.icon;
          const active = isActive(pathname, entry.href);
          return (
            <Link
              key={entry.key}
              href={entry.href}
              className={`sb-item${active ? ' active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={17} />
              <span>{entry.label}</span>
              {active && <span className="sb-active-bar" aria-hidden />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sb-foot">
        <button
          onClick={toggle}
          className="sb-theme"
          aria-label="Basculer le thème"
        >
          <span className="sb-theme-track">
            <span className={`sb-theme-thumb ${theme}`}>
              {theme === 'dark' ? <Icons.moon size={10} /> : <Icons.sun size={10} />}
            </span>
          </span>
          <span>{theme === 'dark' ? 'Mode sombre' : 'Mode clair'}</span>
        </button>

        <div className="sb-user">
          <span
            aria-hidden
            style={{
              display: 'inline-flex',
              width: 32,
              height: 32,
              borderRadius: 8,
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              fontWeight: 500,
              flexShrink: 0,
              background: 'var(--surface-3)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--fg)',
            }}
          >
            {initials}
          </span>
          <div style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={displayName}>
              {displayName}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user ? orgName : 'Session en cours…'}
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Se déconnecter"
            title="Se déconnecter"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 6,
              flexShrink: 0,
              color: 'var(--fg-muted)',
              transition: 'background 0.2s',
            }}
          >
            <Icons.logOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
