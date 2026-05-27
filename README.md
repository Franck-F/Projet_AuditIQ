# AuditIQ

[![CI](https://github.com/Franck-F/Projet_AuditIQ/actions/workflows/ci.yml/badge.svg)](https://github.com/Franck-F/Projet_AuditIQ/actions/workflows/ci.yml)

Plateforme SaaS d'audit de fairness IA pour PME françaises et européennes.
Détecter, expliquer et documenter les biais de systèmes d'IA, sans écrire de code.

> AuditIQ est un outil de **détection et de documentation**.
> Il n'est ni un correcteur automatique de modèle, ni un certificat de conformité.

---

## Stack

| Couche | Technologie |
|---|---|
| Frontend | Next.js 16 (Turbopack), TypeScript strict, Tailwind v4, shadcn/ui, TanStack Query, Zustand, React Hook Form, Zod, Recharts, Framer Motion, Axios, `@supabase/ssr` |
| Backend | FastAPI 0.115, Python 3.12, SQLAlchemy 2 async, Alembic, PyJWT[crypto] (vérif JWT Supabase ES256 via JWKS), SlowAPI |
| Data / engine | Pandas, NumPy, Scikit-learn, Fairlearn (test only), SciPy, Statsmodels |
| LLM | Google Gemini (par défaut) + Mistral (fallback souverain) — `LLMProvider` interface |
| Rapports | Puppeteer (PDF, microservice Node `apps/pdf`) + OpenPyXL (Excel, dans `apps/api`) |
| Async | `asyncio.create_task` + semaphore borné (in-process, `audit_max_concurrency=3`) — pas de Redis/Celery |
| Auth, DB, Storage | Supabase (Postgres 16, RLS, Storage buckets `datasets`+`reports`) |
| Tests | pytest 277 · vitest 41 · Playwright 10 (5 spec files) |
| CI | GitHub Actions (`pytest · ruff · mypy --strict · vitest · eslint · tsc`) |
| Deploy | Render (API + PDF, EU-Frankfurt) + Vercel (Web, CDG) — voir `docs/deployment.md` |

## Monorepo

```
auditiq/
├── apps/
│   ├── web/         # Next.js 16 — marketing + app (vercel.json pour deploy)
│   ├── api/         # FastAPI — API + audit engine + reporting + migrations
│   └── pdf/         # Microservice Node — HTML→PDF Puppeteer
├── docs/
│   ├── architecture.md
│   ├── deployment.md
│   ├── adr/                       # Architecture Decision Records
│   ├── superpowers/specs/         # Designs validés (1 par feature majeure)
│   └── superpowers/plans/         # Plans d'implémentation TDD bite-size
├── .github/workflows/             # CI (ci.yml)
├── render.yaml                    # IaC Render (API + PDF)
└── pnpm-workspace.yaml
```

> Note : `packages/` figurait dans une version aspirationnelle initiale
> (`shared-types`, `ui-tokens`, `prompt-bank`) — YAGNI'd pendant la
> construction (tokens Tailwind v4 inline dans `globals.css`, types côté
> Web tirés à la main de l'OpenAPI, prompts M3 vivent dans
> `apps/api/app/audit_engine/`). Pas créé, pas regretté.

## Prérequis

- Node 20+
- pnpm 9+
- Python 3.10 – 3.12 (testé 3.12)
- [uv](https://docs.astral.sh/uv/) (gestionnaire Python rapide)
- Compte Supabase (projet créé, clés disponibles)

## Setup local

```sh
# 1. Cloner et installer
pnpm install

# 2. Copier l'env (deux destinations : root pour le web, apps/api pour l'api)
cp .env.example apps/web/.env.local       # web : NEXT_PUBLIC_*
cp .env.example apps/api/.env             # api : SUPABASE_*, GEMINI_*, etc.

# 3. Renseigner les clés Supabase + Gemini dans les deux fichiers .env

# 4. API (Python)
cd apps/api
uv sync --extra dev                       # ou: python -m venv .venv && pip install -e ".[dev]"
uv run alembic upgrade head               # applique toutes les migrations sur ta DB Supabase
uv run uvicorn app.main:create_app --factory --port 8000

# 5. PDF microservice (Node)
cd apps/pdf
PORT=3001 PDF_SERVICE_SECRET=<même secret que apps/api/.env> node server.mjs

# 6. Web (Next.js, depuis la racine)
pnpm --filter @auditiq/web dev            # http://localhost:3000
```

## Scripts racine

```sh
pnpm dev          # lance le web sur :3000
pnpm build        # build le web
pnpm lint         # lint tous les packages
pnpm typecheck    # typecheck tous les packages
pnpm test         # tests unitaires
pnpm format       # prettier --write
```

## Tests

```sh
# API (pytest 277 — SQLite en mémoire, pas besoin de DB)
cd apps/api && uv run pytest -q

# Web (vitest 41)
pnpm --filter @auditiq/web test

# E2E Playwright (10 scénarios — requires running stack + .env.e2e)
pnpm --filter @auditiq/web e2e:install    # une fois (download chromium)
pnpm --filter @auditiq/web e2e            # ~5 min
pnpm --filter @auditiq/web e2e:report     # rapport HTML
```

Voir `apps/web/e2e/.env.e2e.example` pour les variables nécessaires
à la suite E2E.

## Déploiement

Render (API + PDF) + Vercel (Web). Configuration as code :
`render.yaml` + `apps/web/vercel.json`. Procédure complète et
checklist post-deploy : **[`docs/deployment.md`](docs/deployment.md)**.

Previews PR automatiques sur les 2 plateformes (Render
`previews.generation: automatic`, Vercel built-in).

## CI

`.github/workflows/ci.yml` — 2 jobs parallèles (API, Web) sur chaque
push `main` + chaque PR. ~3 min total. Pas d'E2E en CI (a besoin d'une
stack live + WARP/contournement DNS).

## Conventions

- Commits : Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`).
- Branches : `main` (intégration) + worktrees `worktree-<name>` (feature).
- Code : ESLint + Prettier (web), Ruff + mypy --strict (api).
- Aucun secret dans le repo. Toujours `.env.example` à jour.
- Toute évolution majeure d'architecture → ADR dans `docs/adr/`.

## Documentation

- `docs/architecture.md` — vue d'ensemble + décisions structurantes
- `docs/deployment.md` — Render + Vercel setup, env vars, previews, rollback
- `docs/adr/` — Architectural Decision Records
- `docs/superpowers/specs/` — Designs validés (7 features)
- `docs/superpowers/plans/` — Plans d'implémentation TDD bite-size (21 plans)

## Principes produit

1. **Détection ≠ verdict.** Toujours niveau de risque + explication + limites.
2. **Pas de promesse réglementaire absolue.** Jamais « certifié conforme ».
3. **Minimisation des données.** TTL automatique (30 j par défaut) sur les datasets.
4. **Pédagogie d'abord.** L'UX cible des non-spécialistes.
5. **Souveraineté.** Hébergement UE (Render Frankfurt + Vercel CDG + Supabase EU).

## Statut

✅ **Livraison complète** des 3 modules mémoire et des 3 incréments différés :

- **M1** — Audit supervisé (Disparate Impact, règle des 4/5, Equal
  Opportunity & Equalized Odds via colonne vérité-terrain, analyse
  intersectionnelle 2-voies avec contraste Simpson's-paradox)
- **M2** — Détection non supervisée (KMeans + IQR pré-check, χ² par
  cluster, verdict transversal)
- **M3** — Audit LLM/chatbot (LangBiTe paired prompts, client cible
  SSRF-hardened avec deadline 45 s, 3 gap metrics, AI Act art. 50 +
  CNIL)
- **Async** — POST /audits 202 + tâche de fond bornée + polling web 2 s
- **Reporting** — Excel (OpenPyXL) + PDF (Puppeteer) transversal aux 3
  modules
- **E2E** — 10 scénarios Playwright validés contre la stack live

Le scope produit est figé. Les ajouts post-mémoire (CI, IaC deploy,
documentation déploiement) sont des contributions d'outillage, pas de
nouvelle feature produit.
