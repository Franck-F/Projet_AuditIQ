# AuditIQ — Architecture

Document vivant. Toute évolution majeure → ADR dans `docs/adr/`.

## 1. Topologie

```
                   Marketing (SSG/ISR)  ───┐
                                            ├── Next.js 16 (apps/web)
                   Auth (SSR)           ───┤
                                            │
                   App protégée (SSR/CSR)──┘
                                  │
                                  │  REST + Axios + JWT Supabase
                                  ▼
                           FastAPI (apps/api)
                                  │
        ┌────────────────────────┼─────────────────────────────┐
        ▼                        ▼                              ▼
  Supabase Postgres      APScheduler              Audit engine (pur)
  (RLS + pgcrypto)       (jobstore Postgres)      Pandas / Fairlearn / KMeans
                                  │
                                  ▼
                         Interpretation layer
                         Gemini (defaut) · Mistral (fallback)
                                  │
                                  ▼
                         Reporting layer
                         PDF (Puppeteer microservice)
                         Excel (OpenPyXL)
                                  │
                                  ▼
                         Supabase Storage
                         (datasets · reports)
```

## 2. Couches backend

1. **Router** (`app/routers/`) — I/O HTTP, validation Pydantic, codes d'erreur.
2. **Service** (`app/services/`) — orchestration (DB + queue + storage). Aucune logique math.
3. **Audit engine** (`app/audit_engine/`) — pur, sans I/O. `DataFrame + config` → `dict` typé.
4. **Interpretation** (`app/interpretation/`) — convertit le JSON technique en texte + ancrages réglementaires. Seule couche autorisée à appeler un LLM.
5. **Reporting** (`app/reporting/`) — PDF (déléguée au microservice Puppeteer) + Excel (OpenPyXL).
6. **Integrations** (`app/integrations/`) — Supabase Storage, JWKS Supabase, Gemini, Mistral.

## 3. Frontend state

| Type d'état | Outil |
|---|---|
| Server state | TanStack Query |
| UI state local | Zustand |
| Form state | React Hook Form + Zod |
| URL state | searchParams Next |

## 4. Décisions structurantes (résumé — ADR pour les détails)

- **Auth Supabase** ; côté API on ne vérifie que les JWT (JWKS).
- **Supabase Storage** pour datasets et rapports (URL signées, TTL 15 min).
- **APScheduler in-process** pour MVP ; bascule Celery + Redis si M3 > 5 min p95.
- **TanStack Query + Zustand** (server state vs UI state séparés strictement).
- **PDF via Puppeteer** (microservice Node `apps/pdf`) — pas ReportLab.
- **Excel via OpenPyXL** côté FastAPI.
- **LLM** : Gemini par défaut, Mistral en fallback (souveraineté FR/UE Enterprise).
- **Tailwind v4** : tokens AuditIQ portés en `@theme inline` (cf. `apps/web/app/globals.css`).

## 5. Sécurité

- TLS 1.3 only, headers HSTS, CSP strict, X-Frame-Options DENY.
- RLS Supabase activée sur tables sensibles (datasets, audits, reports).
- `activity_log` append-only (trigger Postgres bloque UPDATE/DELETE).
- Secrets via `.env` local, Doppler / Supabase Vault en prod.
- SlowAPI : `60/min` défaut, `10/min` sur `/auth/*` et upload.
- Logs JSON structurés ; jamais de PII dans les logs.

## 6. Conformité

- AI Act articles 10, 13, 15, 17 + Annexe IV référencés dans les rapports.
- Code travail L.1132-1, Code pénal 225-1/2, RGPD article 22 cités dans les ancrages.
- TTL datasets configurable par org (défaut 30 jours).
- Export RGPD + purge avec preuve cryptographique sur suppression de compte.
- Aucune formulation absolue : pas de « certifié conforme », « garanti », « 100 % ».
