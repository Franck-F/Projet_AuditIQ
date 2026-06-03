# Refonte R4 — Dashboard + Audits list + Team + Settings + Support + Auth

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Appliquer le design Claude Design (pages_core.jsx Dashboard/AuditsList + pages_secondary.jsx Team/Settings/Support/Auth) sur les pages restantes de l'application.

**Architecture:** Refonte visuelle pure — hooks data (`useDashboard`) inchangés, état local pour les pages sans API (Team/Settings/Support mocked). Auth conserve les flows existants (Supabase) avec le nouveau visuel split-screen.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4. Primitives R3 (Meter, Tabs, InlineNote) + existing (Stoplight, StatusBadge, MetricCard, Sparkline, Card, Button[+outline], Topbar[+actions]).

**Design references:**
- `docs/design/auditiq-refonte/pages_core.jsx` (lignes 70-230 : Dashboard + AuditsList)
- `docs/design/auditiq-refonte/pages_secondary.jsx` (lignes 88-288 : Team/Settings/Support/Auth)

---

## Task 1: Primitives (Toggle, Avatar, SectionHead, Choice)

**Files:**
- Create: `apps/web/components/product/Toggle.tsx`
- Create: `apps/web/components/product/Avatar.tsx`
- Create: `apps/web/components/product/SectionHead.tsx`
- Create: `apps/web/components/product/Choice.tsx`
- Test: `apps/web/__tests__/refonte-primitives-r4.test.tsx`

- [ ] **Step 1: Toggle (controlled switch)**

```tsx
// apps/web/components/product/Toggle.tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, ariaLabel, className, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border transition-colors disabled:opacity-50',
        checked ? 'border-accent bg-accent' : 'border-border-default bg-surface-3',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'inline-block size-4 rounded-full transition-transform',
          checked ? 'translate-x-5 bg-accent-fg' : 'translate-x-1 bg-fg-muted',
        )}
      />
    </button>
  );
}
```

- [ ] **Step 2: Avatar (initials circle)**

```tsx
// apps/web/components/product/Avatar.tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps {
  name: string;
  size?: number;
  className?: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0]?.[0] ?? '?').toUpperCase();
  return `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase();
}

export function Avatar({ name, size = 32, className }: AvatarProps) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full border border-border-default bg-surface-2 font-mono font-medium text-fg-secondary',
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
```

- [ ] **Step 3: SectionHead (eyebrow + title + optional subtitle)**

```tsx
// apps/web/components/product/SectionHead.tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

interface SectionHeadProps {
  eyebrow?: string;
  title: string;
  sub?: string;
  className?: string;
}

export function SectionHead({ eyebrow, title, sub, className }: SectionHeadProps) {
  return (
    <header className={cn('mb-4', className)}>
      {eyebrow && (
        <div className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
          {eyebrow}
        </div>
      )}
      <h2 className="text-[16px] font-medium tracking-[-0.01em] text-fg">{title}</h2>
      {sub && <p className="mt-1 text-[13px] leading-relaxed text-fg-secondary">{sub}</p>}
    </header>
  );
}
```

- [ ] **Step 4: Choice (radio-style card)**

```tsx
// apps/web/components/product/Choice.tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

interface ChoiceProps {
  selected: boolean;
  onClick: () => void;
  title: string;
  desc?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  className?: string;
}

export function Choice({ selected, onClick, title, desc, icon: Icon, className }: ChoiceProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
        selected ? 'border-accent bg-accent-softer' : 'border-border-default bg-surface hover:border-border-strong',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border',
          selected ? 'border-accent' : 'border-border-strong',
        )}
      >
        {selected && <span className="size-2 rounded-full bg-accent" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[14px] font-medium text-fg">
          {Icon && <Icon size={15} className={selected ? 'text-accent' : 'text-fg-muted'} />}
          {title}
        </span>
        {desc && <span className="mt-1 block text-[12.5px] leading-relaxed text-fg-muted">{desc}</span>}
      </span>
    </button>
  );
}
```

- [ ] **Step 5: Tests + commit**

```tsx
// apps/web/__tests__/refonte-primitives-r4.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import { Toggle } from '@/components/product/Toggle';
import { Avatar } from '@/components/product/Avatar';
import { SectionHead } from '@/components/product/SectionHead';
import { Choice } from '@/components/product/Choice';

describe('R4 primitives', () => {
  it('Toggle exposes role=switch with aria-checked + fires onChange on click', async () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} ariaLabel="Notif" />);
    const sw = screen.getByRole('switch', { name: 'Notif' });
    expect(sw).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(sw);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('Avatar renders initials from name', () => {
    render(<Avatar name="Léa Moreau" />);
    expect(screen.getByText('LM')).toBeInTheDocument();
  });

  it('SectionHead renders eyebrow + title + sub', () => {
    render(<SectionHead eyebrow="Activité" title="Audits" sub="Récents" />);
    expect(screen.getByText('Activité')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Audits' })).toBeInTheDocument();
    expect(screen.getByText('Récents')).toBeInTheDocument();
  });

  it('Choice toggles aria-checked + onClick fires', async () => {
    const onClick = vi.fn();
    render(<Choice selected={false} onClick={onClick} title="Option A" />);
    const radio = screen.getByRole('radio', { name: /Option A/ });
    expect(radio).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(radio);
    expect(onClick).toHaveBeenCalled();
  });
});
```

```bash
git add apps/web/components/product/Toggle.tsx apps/web/components/product/Avatar.tsx apps/web/components/product/SectionHead.tsx apps/web/components/product/Choice.tsx apps/web/__tests__/refonte-primitives-r4.test.tsx
git commit -m "feat(web): R4 primitives — Toggle, Avatar, SectionHead, Choice"
```

---

## Task 2: Dashboard refonte (`app/app/page.tsx`)

**Files:**
- Modify: `apps/web/app/app/page.tsx` (222 → ~250 lignes)
- Test: `apps/web/__tests__/dashboard-refonte.test.tsx`

**Design reference:** `docs/design/auditiq-refonte/pages_core.jsx` lines 70-162 (`Dashboard`).

**Requirements:**
- Topbar avec actions: bouton "Nouvel audit" → `/app/audits/nouveau`
- Hero band: paragraphe "Bonjour Léa. Voici l'état…" — pour l'instant, salutation générique "Bonjour. Voici l'état de conformité fairness…"
- Grid 4 MetricCards : Score conformité (riskScore), Audits actifs (total), Modèles non conformes (failing), Délai moyen — backend ne renvoie pas le délai, mettre "—"
- Grid 1.55fr/1fr :
  - Recent audits table (5 rows max from `recent_audits`) avec lien row → `/app/audits/<id>`
  - Right column: 2 cards (Tendance + Sparkline) + Répartition pass/warn/fail
- Action band: "Lancez un audit en moins de 7 minutes" → CTA → `/app/audits/nouveau`

**Data:** `useDashboard()` (existing).

- [ ] **Step 1:** Read design + current page + useDashboard

- [ ] **Step 2:** Rewrite page

- [ ] **Step 3:** Test mocks useDashboard with full payload, asserts: 4 MetricCards visible, table with 4 rows, action band CTA present.

- [ ] **Step 4:** Commit
```bash
git commit -m "feat(web): R4 dashboard refonte — hero + metrics + recent + trend"
```

---

## Task 3: Audits list refonte (`app/app/audits/page.tsx`)

**Files:**
- Modify: `apps/web/app/app/audits/page.tsx`
- Test: `apps/web/__tests__/audits-list-refonte.test.tsx`

**Design reference:** `docs/design/auditiq-refonte/pages_core.jsx` lines 167-230 (`AuditsList`).

**Requirements:**
- Topbar avec action "Nouvel audit"
- Grid 4 MetricCards: Total / Conformes / Sous vigilance / Non conformes
- Card with header bar: Tabs (Tous / Non conformes / Sous vigilance / Conformes) + boutons "Filtres" et "Exporter"
- Table: Audit (title + code mono) / Attribut protégé (chip) / Score fairness (number + progress bar) / Statut (badge dot) / Responsable (avatar + first name) / Exécuté (relative date)
- Row click → `/app/audits/<id>`
- "Exporter" pour l'instant logguer un toast/console (placeholder)

**Data:** `useDashboard()` → `recent_audits` (extend to full list later — for now use that)

- [ ] **Step 1:** Read design + current page
- [ ] **Step 2:** Rewrite using Tabs primitive + filter state
- [ ] **Step 3:** Test asserts filter chips, 4 metric cards, table interaction
- [ ] **Step 4:** Commit `feat(web): R4 audits list refonte — filtres + table`

---

## Task 4: Team + Support refonte

**Files:**
- Modify: `apps/web/app/app/equipe/page.tsx`
- Modify: `apps/web/app/app/support/page.tsx`
- Test: `apps/web/__tests__/equipe-support-refonte.test.tsx`

**Design references:**
- `pages_secondary.jsx` lines 88-124 (`Team`)
- `pages_secondary.jsx` lines 204-228 (`Support`)

### Team requirements:
- Topbar action "Inviter un membre" (no-op button for now)
- Grid 3 MetricCards: Membres actifs / Administrateurs / Accès externes
- SectionHead "Membres — Qui a accès à l'espace"
- Table: Membre (avatar + nom + email) / Rôle / Niveau accès (chip) / Statut (badge) / Actions (icon-btn ...) 
- Mock data (4 members) hard-coded for now

### Support requirements:
- Topbar
- Centered search input ("Rechercher dans l'aide…")
- Grid 3 Cards (Démarrage rapide / Guide méthodologique / Cadre réglementaire)
- Card "Besoin d'un accompagnement personnalisé" with primary button

- [ ] **Steps:** read design, rewrite, test, commit `feat(web): R4 équipe + support refonte`

---

## Task 5: Settings refonte (consolidate to 1 page with 6 internal tabs)

**Files:**
- Create: `apps/web/app/app/parametres/page.tsx`
- Delete: `apps/web/app/app/parametres/entreprise/page.tsx` (consolidate)
- Test: `apps/web/__tests__/parametres-refonte.test.tsx`

**Design reference:** `pages_secondary.jsx` lines 131-202 (`Settings`).

**Requirements:**
- Topbar "Paramètres" (no action)
- Two-column layout: sticky sidenav 200px + content max-width 680px
- Sidenav 6 items: Entreprise / Profil / Notifications / Seuils & règles / API & intégrations / Sécurité
- Internal state for active tab
- Render each tab's content (forms, lists with toggles) per design — use Input, Select, Field, Toggle, InlineNote primitives
- Mock data; no backend integration (forms are presentational only for now)

- [ ] **Steps:** read design, create page, test renders sidenav + each tab on click, commit `feat(web): R4 paramètres refonte — sidenav 6 tabs`

---

## Task 6: Auth refonte (connexion + inscription split-screen)

**Files:**
- Modify: `apps/web/app/(auth)/connexion/page.tsx`
- Modify: `apps/web/app/(auth)/inscription/page.tsx`
- Modify: `apps/web/components/auth/AuthShell.tsx`
- Test: `apps/web/__tests__/auth-refonte.test.tsx`

**Design reference:** `pages_secondary.jsx` lines 231-286 (`Auth`).

**Requirements:**
- AuthShell becomes split-screen: left brand panel (40-50%) + right form column
- Left panel: logo + chip "Conforme AI Act · RGPD" + h2 + paragraphe + bullet list (3 benefits with check icon) + footer (SOC 2 / ISO 27001 / Hébergé en UE)
- Right column: theme toggle button (top-right), tabs (Connexion / Créer un compte) at top of form
- Forms keep existing Supabase auth handlers — only change visual structure
- Switch between connexion/inscription via Link (Next.js) — design uses internal tabs, but our routes are separate; use the tabs as navigation links

- [ ] **Steps:** read design + current AuthShell + connexion/inscription pages; rewrite AuthShell to split-screen; pages updated with new tab nav; test asserts h2 brand text + form labels + tab nav. Commit `feat(web): R4 auth refonte — split-screen brand + tabs`

---

## Task 7: Final gate + push + PR

- [ ] **Step 1:** `cd apps/web && pnpm typecheck && pnpm lint && pnpm test`
- [ ] **Step 2:** Identity audit + filter-branch fix if drift
- [ ] **Step 3:** Push + PR via gh
