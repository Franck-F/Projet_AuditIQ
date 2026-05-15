# ADR 0001 — Stack fondatrice

- **Date** : 2026-05-14
- **Statut** : Accepté
- **Décideurs** : Équipe AuditIQ

## Contexte

Le brief produit fixe une stack précise : Next.js 16, Tailwind v4, FastAPI Python 3.10, Supabase, Gemini, etc.
Le handoff design (`Design/CLAUDE.md`) proposait une alternative (Drizzle, Mistral, react-pdf, Inngest).
Plusieurs zones d'ambiguïté restaient à trancher avant la Phase 0.

## Décisions

1. **Auth = Supabase Auth** (et pas implémentation maison Bcrypt/OAuth2). L'API ne fait que vérifier les JWT contre JWKS.
2. **Server state = TanStack Query** (en complément de Zustand pour le UI state). Zustand seul oblige à réinventer cache/invalidation.
3. **PDF = Puppeteer** via microservice Node `apps/pdf` (route SSR `/app/rapports/[id]/print`). Excel reste OpenPyXL côté FastAPI.
4. **LLM = Gemini par défaut + Mistral en fallback** via interface `LLMProvider`. Le choix se fait par org (`settings.llm_provider`).
5. **Stockage = Supabase Storage** (datasets + rapports). URL signées 15 min.
6. **Workers = APScheduler in-process**, jobstore Postgres. Bascule Celery+Redis si M3 dépasse 5 min p95.
7. **Tailwind v4** : tokens AuditIQ portés en `@theme inline` dans `globals.css`. `components.css` conservé pour les composants non encore migrés en utilitaires.
8. **Framer Motion** : usage scopé — scroll reveal marketing, micro-interactions app. Jamais sur les rendus de résultats fairness.

## Conséquences

- Surface d'attaque auth réduite (delegation à Supabase).
- Un microservice Node supplémentaire (Puppeteer) ; coût opérationnel acceptable, fidélité visuelle bien meilleure que ReportLab.
- Pas de Redis pour MVP (simplification infra).
- Une dépendance forte à Supabase ; sortie possible mais coûteuse (migration Postgres + remplacement Storage + Auth).

## Alternatives écartées

- **NextAuth + Drizzle** (CLAUDE.md original) : doublait l'effort vs Supabase déjà nécessaire.
- **Mistral exclusif** : couverture LLM moindre pour M3 en dev FR ; gardé en fallback uniquement.
- **ReportLab** : qualité visuelle insuffisante pour des rapports clients.
