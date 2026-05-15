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
