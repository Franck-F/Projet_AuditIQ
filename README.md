# AuditIQ

Plateforme SaaS d'audit de fairness IA pour PME françaises et européennes.
Détecter, expliquer et documenter les biais de systèmes d'IA, sans écrire de code.

> AuditIQ est un outil de **détection et de documentation**.
> Il n'est ni un correcteur automatique de modèle, ni un certificat de conformité.

---

## Stack

| Couche | Technologie |
|---|---|
| Frontend | Next.js 16, TypeScript strict, Tailwind v4, shadcn/ui, TanStack Query, Zustand, React Hook Form, Zod, Recharts, Framer Motion, Axios |
| Backend | FastAPI, Python 3.10, SQLAlchemy 2 async, Alembic, PyJWT (vérif JWT Supabase), SlowAPI |
| Data / engine | Pandas, NumPy, Scikit-learn, Fairlearn, SciPy, Statsmodels |
| LLM | Google Gemini (par défaut) + Mistral (fallback souverain) |
| Rapports | Puppeteer (PDF, microservice Node) + OpenPyXL (Excel) |
| Scheduling | APScheduler (jobstore Postgres) |
| Auth, DB, Storage | Supabase (Postgres 16) |

## Monorepo

```
auditiq/
├── apps/
│   ├── web/         # Next.js 16 — marketing + app
│   └── api/         # FastAPI — API + audit engine + reporting
├── packages/
│   ├── shared-types/    # types TS partagés
│   ├── ui-tokens/       # tokens.css + Tailwind preset
│   └── prompt-bank/     # banque versionnée FR pour M3
├── docs/                # architecture, ADR, API
└── .github/workflows/   # CI
```

## Prérequis

- Node 20+
- pnpm 9+
- Python 3.10+
- [uv](https://docs.astral.sh/uv/) (gestionnaire Python rapide) ou Poetry
- Compte Supabase (projet créé, clés disponibles)

## Setup local

```sh
# 1. Cloner et installer
pnpm install

# 2. Copier l'env
cp .env.example .env.local           # web
cp .env.example apps/api/.env        # api

# 3. Renseigner les clés Supabase + Gemini dans les deux fichiers .env

# 4. API (Python)
cd apps/api
uv sync                              # ou: python -m venv .venv && pip install -e .
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000

# 5. Web (Node)
pnpm --filter @auditiq/web dev       # http://localhost:3000
```

## Scripts racine

```sh
pnpm dev          # lance le web
pnpm build        # build le web
pnpm lint         # lint tous les packages
pnpm typecheck    # typecheck tous les packages
pnpm test         # tests unitaires
pnpm format       # prettier --write
```

## Conventions

- Commits : Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`).
- Branches : `main` (prod), `develop` (intégration), `feat/*`, `fix/*`.
- Code : ESLint + Prettier (web), Ruff + mypy (api).
- Aucun secret dans le repo. Toujours `.env.example` à jour.
- Toute évolution majeure d'architecture → ADR dans `docs/adr/`.

## Documentation

- `docs/architecture.md` — vue d'ensemble + décisions structurantes
- `docs/data-model.md` — schéma DB et règles RLS
- `docs/api.md` — contrats REST (généré depuis OpenAPI)
- `docs/adr/` — Architectural Decision Records

## Principes produit

1. **Détection ≠ verdict.** Toujours niveau de risque + explication + limites.
2. **Pas de promesse réglementaire absolue.** Jamais « certifié conforme ».
3. **Minimisation des données.** TTL automatique sur les datasets utilisateurs.
4. **Pédagogie d'abord.** L'UX cible des non-spécialistes.
5. **Souveraineté.** Hébergement UE, données client hors USA documentées.

## Statut

✅ Slice M1 complète end-to-end : web (auth Supabase, `/app` protégé, dashboard
live, **assistant de création d'audit + page résultat**) → API (upload CSV,
audit M1, interprétation Gemini+fallback, dashboard), org-scoped et durcie.
Suite : modules M2/M3, async, export PDF/Excel (hors slice M1).
