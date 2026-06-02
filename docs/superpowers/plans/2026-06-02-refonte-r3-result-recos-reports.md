# Refonte R3 — Résultat d'audit + Recommandations + Rapports

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Appliquer le design Claude Design (pages_result.jsx + pages_secondary.jsx Reports/Reco) sur les 3 pages applicables, en gardant le branchement données existant.

**Architecture:** Refonte visuelle pure — types et hooks (`useAudit`, `useDashboard`) inchangés. On ajoute 3 primitives partagées (Meter, Tabs, InlineNote) puis on réécrit les 3 pages.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, tokens OKLCH (déjà en place via R1), existing primitives (Stoplight, StatusBadge, MetricCard, Sparkline, Card, Button).

**Design reference:** `docs/design/auditiq-refonte/pages_result.jsx` + `pages_secondary.jsx` (functions `Result`, `Reco`, `Reports`).

---

## Task 1: Primitives (Meter, Tabs, InlineNote)

**Files:**
- Create: `apps/web/components/product/Meter.tsx`
- Create: `apps/web/components/product/Tabs.tsx`
- Create: `apps/web/components/product/InlineNote.tsx`
- Test: `apps/web/__tests__/refonte-primitives.test.tsx`

- [ ] **Step 1: Meter — horizontal bar with threshold marker**

```tsx
// apps/web/components/product/Meter.tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

type Status = 'pass' | 'warn' | 'fail' | 'info';

interface MeterProps {
  value: number;
  threshold?: number;
  max: number;
  status: Status;
  format?: (v: number) => string;
  className?: string;
  ariaLabel?: string;
}

const FILL: Record<Status, string> = {
  pass: 'bg-status-pass',
  warn: 'bg-status-warn',
  fail: 'bg-status-fail',
  info: 'bg-status-info',
};

export function Meter({ value, threshold, max, status, format, className, ariaLabel }: MeterProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const thrPct = threshold !== undefined ? Math.max(0, Math.min(100, (threshold / max) * 100)) : null;
  return (
    <div className={cn('w-full', className)}>
      <div
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={ariaLabel ?? 'Métrique'}
        className="relative h-2 w-full overflow-hidden rounded-full bg-surface-3"
      >
        <div className={cn('h-full rounded-full transition-[width] duration-700 ease-out', FILL[status])} style={{ width: `${pct}%` }} />
        {thrPct !== null && (
          <span aria-hidden className="absolute top-[-2px] h-[calc(100%+4px)] w-px bg-fg-muted opacity-70" style={{ left: `${thrPct}%` }} />
        )}
      </div>
      {format && (
        <div className="mt-1 flex justify-between font-mono text-[11px] tabular-nums text-fg-muted">
          <span>{format(value)}</span>
          {threshold !== undefined && <span>Seuil · {format(threshold)}</span>}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Tabs — controlled inline tab strip**

```tsx
// apps/web/components/product/Tabs.tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

interface TabsProps {
  items: ReadonlyArray<{ id: string; label: string }>;
  value: string;
  onChange: (id: string) => void;
  className?: string;
  ariaLabel?: string;
}

export function Tabs({ items, value, onChange, className, ariaLabel = 'Onglets' }: TabsProps) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={cn('flex gap-1 border-b border-border-subtle', className)}>
      {items.map((it) => {
        const active = value === it.id;
        return (
          <button
            key={it.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.id)}
            className={cn(
              'relative -mb-px px-4 py-2.5 text-[13px] font-medium transition-colors',
              active ? 'border-b-2 border-accent text-fg' : 'border-b-2 border-transparent text-fg-muted hover:text-fg-secondary',
            )}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: InlineNote — icon + paragraph card**

```tsx
// apps/web/components/product/InlineNote.tsx
import * as React from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InlineNoteProps {
  children: React.ReactNode;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  className?: string;
}

export function InlineNote({ children, icon: Icon = Info, className }: InlineNoteProps) {
  return (
    <div className={cn('flex gap-3 rounded-lg border border-border-subtle bg-surface-2 px-4 py-3 text-[13px] text-fg-secondary', className)}>
      <Icon size={15} className="mt-0.5 shrink-0 text-fg-muted" />
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}
```

- [ ] **Step 4: Test all 3 primitives render & a11y**

```tsx
// apps/web/__tests__/refonte-primitives.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import { Meter } from '@/components/product/Meter';
import { Tabs } from '@/components/product/Tabs';
import { InlineNote } from '@/components/product/InlineNote';

describe('R3 primitives', () => {
  it('Meter exposes role=meter and aria-valuenow', () => {
    render(<Meter value={0.69} threshold={0.8} max={1} status="fail" ariaLabel="Règle 4/5" />);
    const meter = screen.getByRole('meter');
    expect(meter).toHaveAttribute('aria-valuenow', '0.69');
    expect(meter).toHaveAttribute('aria-label', 'Règle 4/5');
  });

  it('Tabs marks the active tab aria-selected and fires onChange', async () => {
    const onChange = vi.fn();
    render(<Tabs items={[{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }]} value="a" onChange={onChange} />);
    const b = screen.getByRole('tab', { name: 'B' });
    expect(b).toHaveAttribute('aria-selected', 'false');
    await userEvent.click(b);
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('InlineNote renders the icon and text', () => {
    render(<InlineNote>Bonne pratique</InlineNote>);
    expect(screen.getByText('Bonne pratique')).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run tests + commit**

Run: `pnpm test refonte-primitives -- --run`
Expected: 3/3 PASS

```bash
git add apps/web/components/product/Meter.tsx apps/web/components/product/Tabs.tsx apps/web/components/product/InlineNote.tsx apps/web/__tests__/refonte-primitives.test.tsx
git commit -m "feat(web): R3 primitives — Meter, Tabs, InlineNote"
```

---

## Task 2: Audit result page refonte (`audits/[id]/page.tsx`)

**Files:**
- Modify: `apps/web/app/app/audits/[id]/page.tsx` (full rewrite, 721 → ~400 lignes)

**Design reference:** `docs/design/auditiq-refonte/pages_result.jsx` (function `Result`).

**Requirements:**
- Verdict hero band (Stoplight + Gauge + verdict text + risk badge + chips: exécuté, lignes, modèle)
- 4 tabs: Synthèse / Métriques détaillées / Groupes / Méthodologie
- **Synthèse**: card "En clair" (3 lignes : ce qui ne va pas / risque / ce qui fonctionne) + card "Indicateur clé" (gros chiffre + Meter) + card "Actions recommandées" (lien vers /recommandations) + grille 4 Métriques (resté carte avec Meter)
- **Métriques détaillées**: 1 card par métrique (titre + plain text + valeur + Meter)
- **Groupes**: 1 ligne par groupe (nom + chip "Référence" si applicable + barre + ratio) — uniquement pour M1
- **Méthodologie**: 2 cards (Périmètre + Cadre réglementaire)
- Conserver le bouton "Rapport PDF" (existing `downloadReport`) en topbar action
- Conserver le branchement `useAudit(id)` — `metrics` typé `M1MetricsOut | M2MetricsOut | M3MetricsOut | null`
- Pour M2/M3 (pas de "groupes"), masquer l'onglet "Groupes" et adapter les cartes (M2 : clusters déviants, M3 : catégories)
- Pre-checks et warnings restent affichés au-dessus du hero (existing pattern)

**Components used:** `Stoplight`, `StatusBadge`, `Gauge`, `Meter` (new), `Tabs` (new), `InlineNote` (new), `Card`, `Button`.

- [ ] **Step 1: Read design reference and audits.ts types**

Run: `cat docs/design/auditiq-refonte/pages_result.jsx`
Run: `head -210 apps/web/lib/api/audits.ts`

- [ ] **Step 2: Rewrite page.tsx with new structure**

Approach: keep existing loading/error/pending states. Replace the body sections with the new hero + Tabs + tab panes.

Split the M1/M2/M3 branches into 3 sub-functions (already partly there). Reuse Meter for every "value vs threshold" display.

For M1: groups tab renders `metrics.groups[]`. The "Indicateur clé" card uses `metrics.disparate_impact` vs threshold 0.8.

For M2: "Groupes" tab is replaced by "Clusters déviants" — list `metrics.clusters[]` filtered to `is_deviant`. Header indicator card uses `metrics.risk_score / 100` vs threshold 0.5.

For M3: "Groupes" replaced by "Catégories" listing `metrics.categories[]`. Indicator uses `metrics.global_score` vs threshold 0.7.

**Synthèse "En clair" card content** (adapt to module):
- M1: ce qui ne va pas = `worst_group` + DI %, risque = mention AI Act, ce qui fonctionne = EOD/EO si pass
- M2: ce qui ne va pas = nb clusters déviants, risque, ce qui fonctionne = clusters conformes
- M3: ce qui ne va pas = catégories à risque, etc.

Pull the actual textual content from `interpretation.narrative` when present, fallback to canned content.

- [ ] **Step 3: Verify typecheck + run an integration test**

Add: `apps/web/__tests__/audit-result-refonte.test.tsx` covering M1 happy path:
```tsx
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useParams: () => ({ id: 'aud-1' }) }));

import AuditDetailPage from '@/app/app/audits/[id]/page';
import * as audits from '@/lib/api/audits';

const mockM1: audits.AuditOut = { /* ... */ };

describe('Audit detail (refonte)', () => {
  it('renders verdict hero + 4 tabs for M1', async () => {
    vi.spyOn(audits, 'fetchAudit').mockResolvedValue(mockM1);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={qc}><AuditDetailPage /></QueryClientProvider>);
    expect(await screen.findByText(/Verdict de l'audit/i)).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(4);
  });
});
```

Run: `pnpm typecheck && pnpm test audit-result-refonte -- --run`

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/app/audits/\[id\]/page.tsx apps/web/__tests__/audit-result-refonte.test.tsx
git commit -m "feat(web): R3 audit result page — verdict hero + 4 tabs"
```

---

## Task 3: Recommendations page refonte (`recommandations/page.tsx`)

**Files:**
- Modify: `apps/web/app/app/recommandations/page.tsx` (rewrite)

**Design reference:** `docs/design/auditiq-refonte/pages_secondary.jsx` (function `Reco`).

**Requirements:**
- Topbar avec "Recommandations" + bouton "Retour à la liste" → `/app/audits`
- Hero card "Plan de remédiation" : si une seule audit est ciblée par `?auditId=` → afficher recos de cet audit ; sinon → liste agrégée des audits récents en card
- Pour chaque recommandation : numéro coloré (prio), titre, badge tag (prio), description, chips "Impact · …" et "Effort · …"
- Si `?auditId` est absent : afficher une liste d'audits ayant des recos avec un lien "Voir le plan" vers `/app/recommandations?auditId=<id>`
- Branchement données :
  - Lire `?auditId` via `useSearchParams`
  - Si `auditId` présent : `useAudit(auditId)` → `interpretation.recommendations`
  - Sinon : `useDashboard()` → liste des `recent_audits` complets

Mapping `priority` → status :
- `high` → `fail`
- `medium` → `warn`
- `low` → `info`

Static tags par priorité : high="Correctif prioritaire", medium="Atténuation", low="Gouvernance".

Effort/Impact : absents du backend → afficher "—" / "Variable" en fallback.

- [ ] **Step 1: Read design + check current page**

Run: `cat docs/design/auditiq-refonte/pages_secondary.jsx | head -90`

- [ ] **Step 2: Rewrite page**

```tsx
// outline only — implementer fills in
'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Sparkles, TrendingUp, Sliders } from 'lucide-react';

import { Topbar } from '@/components/app/Topbar';
import { StatusBadge } from '@/components/product/StatusBadge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAudit } from '@/lib/query/use-audit';
import { useDashboard } from '@/lib/query/use-dashboard';

const PRIO_MAP = { high: { tone: 'fail', tag: 'Correctif prioritaire' }, medium: { tone: 'warn', tag: 'Atténuation' }, low: { tone: 'info', tag: 'Gouvernance' } } as const;

export default function RecommandationsPage() {
  // ...
}
```

Implementer expands to full code.

- [ ] **Step 3: Test it renders both states**

`apps/web/__tests__/recommandations-refonte.test.tsx`:
- State A: no `auditId` query — renders list of recent audits with verdict badges
- State B: with `auditId` — renders the 3 recos as numbered cards

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/app/recommandations/page.tsx apps/web/__tests__/recommandations-refonte.test.tsx
git commit -m "feat(web): R3 recommendations page — plan de remédiation"
```

---

## Task 4: Reports page refonte (`rapports/page.tsx`)

**Files:**
- Modify: `apps/web/app/app/rapports/page.tsx` (rewrite)

**Design reference:** `docs/design/auditiq-refonte/pages_secondary.jsx` (function `Reports`).

**Requirements:**
- Topbar "Rapports" + bouton "Nouvel audit" → `/app/audits/nouveau`
- 3 MetricCards : rapports générés (= total dashboard.total_audits), signés (= count with verdict not null), en attente (= count with status pending/running)
- Section "Bibliothèque" header + sous-titre
- Tableau : Rapport (titre + code en mono) / Verdict (StatusBadge dot) / Pages (n/d → "—") / Signature ("Signé" si verdict, "Brouillon" sinon) / Date (created_at) / Action (deux boutons: PDF et Excel)
- Click on row → `/app/audits/<id>` (résultat)
- Click on PDF/Excel → `downloadReport(id, 'pdf' | 'xlsx')`, stopPropagation

- [ ] **Step 1: Read design**

- [ ] **Step 2: Rewrite page**

Use `useDashboard()` → `recent_audits` (already returned by API).

Map `recent_audits` items → table rows.

- [ ] **Step 3: Test it renders metrics + table**

`apps/web/__tests__/rapports-refonte.test.tsx`:
- mock useDashboard with 3 recent_audits (2 with verdict, 1 pending)
- check the 3 MetricCards values
- check the table has 3 rows with appropriate "Signé/Brouillon" labels

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/app/rapports/page.tsx apps/web/__tests__/rapports-refonte.test.tsx
git commit -m "feat(web): R3 reports page — bibliothèque avec téléchargement"
```

---

## Task 5: Final gate + push + PR

- [ ] **Step 1: Verify**

```bash
cd apps/web && pnpm typecheck && pnpm lint && pnpm test
```

Expected: typecheck PASS, lint 0 errors, all tests PASS.

- [ ] **Step 2: Audit commits identity**

```bash
git log --format='%an <%ae>' origin/main..HEAD | sort -u   # must be only Franck F
git log --format='%B' origin/main..HEAD | grep -i "co-authored-by" || echo "OK"
```

- [ ] **Step 3: Push + PR**

```bash
git push -u origin worktree-refonte-r3-result-recos-reports
gh pr create --base main --head worktree-refonte-r3-result-recos-reports --title "feat(web): R3 — refonte résultat d'audit + recos + rapports" --body "$(...)"
```
