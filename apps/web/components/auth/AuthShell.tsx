'use client';

import * as React from 'react';
import Link from 'next/link';
import { Shield, CheckCircle2, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/components/app/ThemeProvider';

/* ------------------------------------------------------------------ */
/* New split-screen AuthShell                                          */
/* ------------------------------------------------------------------ */

export interface AuthShellProps {
  /** Active tab for the nav inside the right column */
  activeTab: 'login' | 'signup';
  /** Form heading e.g., "Content de vous revoir" */
  heading: string;
  /** Form intro paragraph */
  intro: string;
  /** Form contents */
  children: React.ReactNode;
}

const BULLETS = [
  "Métriques alignées sur la règle des 4/5 et l'AI Act",
  "Rapports signés et horodatés, prêts pour l'audit",
  'Vos données restent chez vous — calcul en mémoire',
];

export function AuthShell({ activeTab, heading, intro, children }: AuthShellProps) {
  const { theme, toggle } = useTheme();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2" style={{ height: '100dvh', overflow: 'hidden' }}>
      {/* ---- Left brand panel (hidden on mobile, fixed-height on desktop) ---- */}
      <aside
        className="hidden md:flex flex-col justify-between overflow-hidden border-r border-border-subtle bg-surface"
        style={{ padding: '44px 56px', height: '100dvh' }}
      >
        {/* Radial gradient overlay */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(120% 80% at 0% 0%, var(--accent-softer, rgba(16,185,129,0.08)), transparent 50%)',
          }}
        />

        {/* Top: logo */}
        <div className="relative flex items-center gap-[11px]">
          <div className="flex size-8 items-center justify-center rounded-lg bg-accent text-[#0b1410]">
            <Shield size={17} aria-hidden />
          </div>
          <div>
            <div className="text-base font-semibold text-fg">AuditIQ</div>
            <div className="font-mono text-[9.5px] tracking-[0.1em] text-fg-muted uppercase">
              FAIRNESS PLATFORM
            </div>
          </div>
        </div>

        {/* Middle: badge + headline + bullets */}
        <div className="relative max-w-[420px]">
          {/* AI Act badge */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-status-pass-border bg-status-pass-bg px-3 py-1 text-xs font-medium text-status-pass">
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-status-pass"
            />
            Conforme AI Act · RGPD
          </span>

          <h2
            className="mt-[18px] mb-[14px] font-display font-medium text-fg leading-[1.15]"
            style={{ fontSize: 30, letterSpacing: '-0.035em' }}
          >
            Prouvez l'équité de vos modèles d'IA, en quelques minutes.
          </h2>

          <p className="text-[15px] leading-[1.6] text-fg-secondary">
            AuditIQ détecte les biais discriminatoires, calcule les métriques réglementaires et
            génère des rapports opposables. Sans déplacer vos données.
          </p>

          <ul className="mt-[26px] flex flex-col gap-3">
            {BULLETS.map((t) => (
              <li key={t} className="flex gap-[10px] text-[13.5px] text-fg-secondary">
                <CheckCircle2
                  size={17}
                  aria-hidden
                  className="mt-px shrink-0 text-accent"
                />
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom: compliance footer */}
        <div className="relative flex gap-[22px] font-mono text-[12.5px] text-fg-muted">
          <span>SOC 2 Type II</span>
          <span>ISO 27001</span>
          <span>Hébergé en UE</span>
        </div>
      </aside>

      {/* ---- Right form column — only this scrolls when content overflows ---- */}
      <div
        className="relative grid place-items-center bg-bg p-10"
        style={{ height: '100dvh', overflowY: 'auto' }}
      >
        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggle}
          aria-label="Basculer le thème"
          className="absolute top-6 right-6 flex size-9 items-center justify-center rounded-md border border-border-default bg-surface text-fg-muted transition-colors hover:border-border-strong hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
        >
          {theme === 'dark' ? (
            <Sun size={16} aria-hidden />
          ) : (
            <Moon size={16} aria-hidden />
          )}
        </button>

        {/* Form container */}
        <div className="w-full max-w-[440px]">
          {/* Tab strip — underline-style per maquette (active = accent underline) */}
          <div className="mb-7 flex gap-0 border-b border-border-subtle">
            <Link
              href="/connexion"
              aria-current={activeTab === 'login' ? 'page' : undefined}
              className={[
                'flex-1 py-3 text-center text-[14px] font-medium transition-colors',
                activeTab === 'login'
                  ? 'border-b-2 border-accent text-fg'
                  : 'border-b-2 border-transparent text-fg-muted hover:text-fg-secondary',
              ].join(' ')}
              style={{ marginBottom: -1 }}
            >
              Connexion
            </Link>
            <Link
              href="/inscription"
              aria-current={activeTab === 'signup' ? 'page' : undefined}
              className={[
                'flex-1 py-3 text-center text-[14px] font-medium transition-colors',
                activeTab === 'signup'
                  ? 'border-b-2 border-accent text-fg'
                  : 'border-b-2 border-transparent text-fg-muted hover:text-fg-secondary',
              ].join(' ')}
              style={{ marginBottom: -1 }}
            >
              Créer un compte
            </Link>
          </div>

          {/* Heading + intro — left-aligned per maquette */}
          <h1
            className="font-display font-medium text-fg"
            style={{ fontSize: 26, letterSpacing: '-0.025em', marginBottom: 6, lineHeight: 1.15 }}
          >
            {heading}
          </h1>
          <p
            className="text-[14px] leading-relaxed text-fg-muted"
            style={{ marginBottom: 28 }}
          >
            {intro}
          </p>

          {/* Form slot */}
          {children}

          {/* Terms */}
          <p className="mt-5 text-center text-xs leading-[1.5] text-fg-muted">
            En continuant, vous acceptez nos{' '}
            <Link href="/cgu" className="text-fg-secondary underline hover:text-fg">
              conditions
            </Link>{' '}
            et notre{' '}
            <Link href="/confidentialite" className="text-fg-secondary underline hover:text-fg">
              politique de confidentialité
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Legacy exports kept for mot-de-passe-oublie + verification-email    */
/* ------------------------------------------------------------------ */

import { BrandMark } from '@/components/layout/BrandMark';
import { StatusPill } from '@/components/marketing/StatusPill';
import { Eyebrow } from '@/components/marketing/Eyebrow';

interface AuthMainProps {
  children: React.ReactNode;
}

export function AuthMain({ children }: AuthMainProps) {
  return (
    <main className="flex flex-col p-[clamp(40px,6vw,80px)] px-[clamp(24px,5vw,80px)]">
      <BrandMark className="mb-[clamp(32px,4vw,48px)]" />
      <div className="my-auto flex w-full max-w-[440px] flex-col gap-6">{children}</div>
    </main>
  );
}

interface AuthSideProps {
  eyebrow: string;
  title: string;
  body: string;
  metrics?: {
    label: string;
    value: string;
    tone: 'pass' | 'warn' | 'fail' | 'info';
  }[];
  children?: React.ReactNode;
}

export function AuthSide({ eyebrow, title, body, metrics, children }: AuthSideProps) {
  return (
    <aside className="relative hidden flex-col justify-center gap-8 overflow-hidden border-l border-border-subtle bg-surface p-[clamp(40px,6vw,80px)] lg:flex">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(circle at 80% 20%, var(--accent-soft), transparent 50%), radial-gradient(circle at 20% 80%, var(--status-info-bg), transparent 60%)',
        }}
      />
      <div className="relative max-w-[440px]">
        <Eyebrow accent>{eyebrow}</Eyebrow>
        <h2 className="mb-4 mt-3 text-[clamp(28px,3vw,36px)] font-display font-medium leading-[1.2] tracking-[-0.02em] text-fg">
          {title}
        </h2>
        <p className="text-base leading-relaxed text-fg-secondary">{body}</p>
        {metrics && metrics.length > 0 && (
          <div className="mt-8 flex flex-col gap-3">
            {metrics.map((m) => (
              <div
                key={m.label}
                className="flex items-center justify-between gap-3 rounded-md border border-border-default bg-surface-2 p-4"
              >
                <span className="text-sm text-fg-secondary">{m.label}</span>
                <StatusPill tone={m.tone}>{m.value}</StatusPill>
              </div>
            ))}
          </div>
        )}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </aside>
  );
}

export function AuthBenefit({
  num,
  title,
  body,
}: {
  num: string;
  title: string;
  body: string;
}) {
  return (
    <div className="grid grid-cols-[32px_1fr] gap-3">
      <span className="flex size-6 items-center justify-center rounded-md border border-accent-border bg-accent-soft font-mono text-[11px] text-accent">
        {num}
      </span>
      <div>
        <h4 className="mb-1 text-[15px] font-medium text-fg">{title}</h4>
        <p className="text-[13px] leading-[1.5] text-fg-secondary">{body}</p>
      </div>
    </div>
  );
}

interface AuthCenterProps {
  children: React.ReactNode;
}

export function AuthCenter({ children }: AuthCenterProps) {
  return (
    <main className="grid place-items-center px-6 py-[clamp(48px,8vw,96px)]">
      <div className="w-full max-w-[460px]">
        <BrandMark className="mb-10" />
        {children}
      </div>
    </main>
  );
}

export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full max-w-[460px] flex-col gap-5 rounded-2xl border border-border-default bg-surface p-8 sm:p-12">
      {children}
    </div>
  );
}
