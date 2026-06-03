# Refonte R5 — Maquette fidelity (handoff v2)

**Goal:** Bring the implemented app to pixel-fidelity vs Claude Design handoff v2 (`docs/design/auditiq-handoff-v2/`). DESIGN.md governs; CLAUDE.md spec aligns intent. Tokens already match.

**Scope (option b — App + Marketing):** 8 sequential PRs.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, OKLCH tokens (already in place). Build on R1-R4 primitives.

---

## Reference files (in worktree)

- `docs/design/auditiq-handoff-v2/` — full HTML maquette + assets/{tokens,components,app}.css
- `docs/design/auditiq-handoff-v2/CLAUDE.md` — product/spec contract
- DESIGN.md (user-supplied) — visual system law

## Gap analysis (vs current state on main `b5e40b3`)

- ✅ Tokens (apps/web/app/globals.css) match DESIGN.md (Geist, hue 162, surface-inset, track, accent-softer, warm stone light)
- ✅ Primitives present: Stoplight, Gauge, MetricCard, Sparkline, StatusBadge, Meter, Tabs, InlineNote, Toggle, Avatar, SectionHead, Choice
- ❌ Primitives missing: **RatioBar, HeatMap6Axes, ClusterMap, DiffViewer, DropZone, TocSticky, Modal (with confirm-typing)**
- ❌ Pages missing: **/app/onboarding, /app/rapports/[id], /app/etats** (template/empty/error patterns)
- ❌ Parametres: 6 onglets actuels vs 8 spec (add **audit, rapports, facturation**)
- ⚠️ Audit detail page lacks M2 ClusterMap and M3 HeatMap6Axes + DiffViewer
- ⚠️ Marketing pages exist but never audited vs maquette HTML

---

## PR1 — Shared components (Modal, DropZone, RatioBar, HeatMap6Axes, ClusterMap, DiffViewer, TocSticky)

**Files:**
- Create: `apps/web/components/product/Modal.tsx` — confirm-typing variant for destructive
- Create: `apps/web/components/product/DropZone.tsx` — drag/drop + MIME validation + preview
- Create: `apps/web/components/product/RatioBar.tsx` — group comparison bar with 4/5 threshold marker
- Create: `apps/web/components/product/HeatMap6Axes.tsx` — 6 fairness axes grid
- Create: `apps/web/components/product/ClusterMap.tsx` — 2D scatter with hover
- Create: `apps/web/components/product/DiffViewer.tsx` — side-by-side prompt pairs
- Create: `apps/web/components/product/TocSticky.tsx` — sticky TOC synced to scroll
- Test: `apps/web/__tests__/r5-primitives.test.tsx`

**Refs:** `assets/components.css`, `assets/app.css`, `app-audit-m1.html` (RatioBar), `app-audit-m2.html` (ClusterMap), `app-audit-m3.html` (HeatMap6Axes + DiffViewer), `app-rapport.html` (TocSticky), `app-etats.html` (Modal), `app-audit-m1.html` (DropZone).

Single subagent. Aim 35+ tests, all primitives covered.

Commit: `feat(web): R5 primitives — Modal, DropZone, RatioBar, HeatMap6Axes, ClusterMap, DiffViewer, TocSticky`

---

## PR2 — Dashboard maquette fidelity

**Files:**
- Modify: `apps/web/app/app/page.tsx`
- Test: `apps/web/__tests__/dashboard-r5.test.tsx`

Compare current dashboard against `app-dashboard.html`. Apply diff for any visual or content gap (greeting copy, KPI layout, hero band, action band).

Commit: `feat(web): R5 dashboard maquette polish`

---

## PR3 — Audit detail per-module (M1 polish, M2 ClusterMap, M3 HeatMap+DiffViewer)

**Files:**
- Modify: `apps/web/app/app/audits/[id]/page.tsx`
- Test: `apps/web/__tests__/audit-detail-r5.test.tsx`

For M1: polish hero verdict, RatioBar component for group comparison (replace inline bar chart), metric-quad mini cards per `app-audit-m1.html`.

For M2: replace cluster bar list with ClusterMap (2D projection) + feature-rank component per `app-audit-m2.html`.

For M3: replace category cards with HeatMap6Axes + DiffViewer for divergent examples per `app-audit-m3.html`.

Backend data unchanged — purely visual + new primitive plumbing.

Commit: `feat(web): R5 audit detail — RatioBar M1, ClusterMap M2, HeatMap6Axes + DiffViewer M3`

---

## PR4 — Onboarding (5 steps stepper)

**Files:**
- Create: `apps/web/app/app/onboarding/page.tsx`
- Create: `apps/web/components/onboarding/OnboardingStepper.tsx`
- Test: `apps/web/__tests__/onboarding-r5.test.tsx`

5 steps per `app-onboarding.html` + spec §15.6:
1. Bienvenue
2. Profil PME (raison sociale, secteur, taille)
3. Cas d'usage (RH / Finance / SAV — multi-select)
4. Checklist préparation (dataset, modèle, contact DPO)
5. Tutoriel (mini-tour des écrans + CTA "Lancer mon premier audit")

State local + `localStorage` persistence. Final CTA → `/app/audits/nouveau`.

Commit: `feat(web): R5 onboarding 5-step stepper`

---

## PR5 — /app/rapports/[id] + /app/etats template

**Files:**
- Create: `apps/web/app/app/rapports/[id]/page.tsx` — full rapport with TocSticky
- Create: `apps/web/components/rapport/RegulatoryCallout.tsx` — AI Act / droit FR block
- Create: `apps/web/app/app/etats/page.tsx` — gallery of empty/loading/error states
- Test: `apps/web/__tests__/rapport-detail-r5.test.tsx`, `etats-r5.test.tsx`

Per `app-rapport.html` and `app-etats.html`. Rapport reads `useAudit(reportId→auditId)` and renders structured sections with TocSticky on the right. RegulatoryCallout cites AI Act articles + Eur-Lex links.

Etats page: dev-only gallery of empty/loading/error patterns for QA — first-use empty (no audits), no-data, network error, permission denied, processing, success toast cluster.

Commit: `feat(web): R5 rapport detail + etats template gallery`

---

## PR6 — Parametres 6→8 onglets

**Files:**
- Modify: `apps/web/app/app/parametres/page.tsx`
- Test: `apps/web/__tests__/parametres-r5.test.tsx`

Per `app-parametres.html`, 8 onglets:
- entreprise (keep)
- audit (new — defaults wizard, language, dataset retention)
- seuils (rename thresholds — same content)
- rapports (new — PDF template, eIDAS signature opt-in, locale)
- integrations (rename api — Slack, Teams, webhook generic)
- securite (keep security — MFA + SSO)
- facturation (new — plan, sieges, Stripe portal link)
- notifications (keep notif — preferences alerts)

Drop profile (becomes part of avatar dropdown menu — outside scope).

Commit: `feat(web): R5 paramètres — 8 onglets (audit, rapports, facturation)`

---

## PR7 — Auth/Recos/Equipe/Support audit

**Files:**
- Audit + diff: `apps/web/components/auth/AuthShell.tsx`, `connexion/page.tsx`, `inscription/page.tsx`, `mot-de-passe-oublie/page.tsx`, `verification-email/page.tsx`
- Audit + diff: `apps/web/app/app/recommandations/page.tsx`, `equipe/page.tsx`, `support/page.tsx`
- Test: existing tests still green

For each: read maquette HTML, identify visual diffs, apply minimal fixes. Don't touch business logic (Supabase calls, data hooks).

Commit: `feat(web): R5 auth/recos/equipe/support maquette polish`

---

## PR8 — Marketing 10 pages audit vs maquette

**Files:**
- Audit each:
  - `(marketing)/page.tsx` vs `index.html` (landing)
  - `(marketing)/a-propos/page.tsx` vs `a-propos.html`
  - `(marketing)/blog/page.tsx` + `blog/[slug]` (NEW per `blog.html` + `article.html`)
  - `(marketing)/comparatif/page.tsx` vs `comparatif.html`
  - `(marketing)/contact/page.tsx` vs `contact.html`
  - `(marketing)/faq/page.tsx` vs `faq.html`
  - `(marketing)/tarifs/page.tsx` vs `tarifs.html`
  - `(marketing)/temoignages/page.tsx` vs `temoignages.html`
  - `app/not-found.tsx` vs `404.html`

For each: read maquette, apply visual diff. Keep existing copy unless maquette has clearly better French.

If `blog/` doesn't exist yet, create it as MDX skeleton (placeholder list page + sample article).

Commit: `feat(web): R5 marketing pages maquette polish + blog skeleton`

---

## Final gate

Per PR: typecheck + lint + test. Push + PR via gh.

After PR8 merge: archive `.claude/worktrees/refonte-r5-maquette-fidelity` worktree.

Identity audit each PR; filter-branch if drift.
