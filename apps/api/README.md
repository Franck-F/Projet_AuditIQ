# AuditIQ API

FastAPI service powering AuditIQ's fairness audits, interpretation layer and reporting pipeline.

## Stack

- Python 3.10+
- FastAPI · Pydantic v2 · SQLAlchemy 2 (async) · Alembic
- Auth : Supabase JWT (verified via JWKS) — no password handling here
- Data engine : Pandas, NumPy, Scikit-learn, Fairlearn, SciPy, Statsmodels
- LLM : Google Gemini (primary) + Mistral (fallback) via abstract `LLMProvider`
- Scheduling : APScheduler (jobstore Postgres) — in-process for MVP
- Storage : Supabase Storage (datasets + reports)
- Rate limiting : SlowAPI
- Excel exports : OpenPyXL. PDF exports are delegated to an HTTP `pdf-service` (Puppeteer, separate microservice).

## Layout

```
apps/api/
├── app/
│   ├── core/              # config, security, db, deps, errors, logging, scheduler
│   ├── routers/           # I/O: validation + service calls only
│   ├── schemas/           # Pydantic DTOs (request/response)
│   ├── services/          # business orchestration
│   ├── models/            # SQLAlchemy ORM
│   ├── audit_engine/      # pure: m1_supervised / m2_unsupervised / m3_llm + common
│   ├── interpretation/    # Gemini / Mistral, regulatory anchors, disclaimers
│   ├── reporting/         # Excel + PDF (HTTP delegation)
│   ├── integrations/      # supabase_storage, gemini, mistral
│   ├── workers/           # APScheduler jobs
│   └── utils/
├── migrations/            # Alembic
└── tests/
```

## Run

```sh
uv sync                                  # or: python -m venv .venv && pip install -e ".[dev]"
cp ../.env.example .env                  # then fill SUPABASE_DB_URL + JWT secret
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000
```

### Environment

`Settings` reads `apps/api/.env` (working dir = `apps/api`). Required keys for a
real run (defaults are SQLite/dev-safe so tests need no secrets):

- `SUPABASE_URL` — e.g. `https://jiwexpgcfhnsugouzzvg.supabase.co` (used to derive
  the public JWKS URL `…/auth/v1/.well-known/jwks.json`; no secret needed).
- `SUPABASE_DB_URL` — `postgresql+asyncpg://…` (Supabase Postgres).
- `SUPABASE_SERVICE_ROLE_KEY` — used by Plan 2B (Storage); keep server-side only.

Outside `API_ENV=development`, the app fails fast (pydantic `ValidationError`) if
`SUPABASE_URL`/`SUPABASE_DB_URL`/`SUPABASE_SERVICE_ROLE_KEY` are absent or default.
Consolidate all API secrets into `apps/api/.env` (not the repo-root `.env`).

#### Datasets & audits (Plan 2B)

`POST /api/v1/datasets` (multipart `file`) stores the CSV (Supabase Storage in
prod, in-memory in dev/test) and persists a `datasets` row. `POST /api/v1/audits`
(`dataset_id` + column mapping) runs the pure M1 engine and persists
`audits`+`audit_results`. All queries are org-scoped at the service layer.
Interpretation (Gemini) and the dashboard are Plan 2C.

#### Interpretation & dashboard (Plan 2C)

Each audit is interpreted by Gemini (`GEMINI_API_KEY`/`GEMINI_MODEL`) into a
French narrative + AI-Act anchors + disclaimers; on any LLM failure a
deterministic fallback is persisted (`provider="fallback"`) and the audit never
fails. `GET /api/v1/dashboard/summary` returns org-scoped aggregates
(total/failing/warning audits, mean risk score, module usage, recent audits).

OpenAPI doc available at `http://localhost:8000/api/v1/docs`.

## Conventions

- Routers : **no DB calls** — only validation, then call services.
- Services : **no math** — orchestration, transactions.
- `audit_engine/` : pure functions, in = DataFrame + config, out = typed dict. No I/O.
- `interpretation/` : the only layer allowed to call a LLM provider.
- Validation : Pydantic `extra = "forbid"` partout.
- Errors : RFC 7807-like envelope (`type`, `title`, `status`, `detail`, `fields`).
- Logs : structlog JSON, never PII.
- Rate limits : 60/min default, 10/min on `/auth/*` and uploads.
