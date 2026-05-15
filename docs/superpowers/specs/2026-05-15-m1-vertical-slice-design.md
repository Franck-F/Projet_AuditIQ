# Spec — Slice verticale M1 (audit fairness supervisé)

- **Date** : 2026-05-15
- **Statut** : Validé (design approuvé)
- **Projet** : AuditIQ (`apps/web` + `apps/api`)
- **Approche de construction** : A — moteur d'abord, par couches (bas → haut)

## 1. Objectif et contexte

AuditIQ est en Phase 0 : le web tourne sur des mocks (`apps/web/lib/mocks/dashboard.ts`),
l'API est un squelette vide. Ce spec décrit le **premier incrément livrable** : une slice
verticale du module **M1 (audit de fairness supervisé)** qui traverse toutes les couches
et remplace les mocks du dashboard par des données réelles.

Cet incrément dérisque le cœur du produit : les mathématiques de fairness, le modèle de
données, et le contrat web ↔ api.

### Périmètre — DANS

- Auth Supabase réelle minimale (vérification JWT via JWKS côté API).
- Persistance Postgres + politiques RLS écrites en migration.
- Upload CSV vers Supabase Storage.
- Moteur M1 **synchrone** : 1 attribut protégé + 1 colonne de décision binaire,
  sans labels vrais. Sorties : Disparate Impact (règle des 4/5), Demographic Parity,
  taux de sélection par groupe, verdict pass/warn/fail, risk_score 0–100.
- Couche interprétation **Gemini** (narratif FR + ancrages AI Act + disclaimers),
  derrière une interface `LLMProvider` (Mistral câblable plus tard).
- Dashboard branché sur données réelles à la place des mocks.

### Périmètre — REPORTÉ (hors de cette slice)

APScheduler / exécution async ; export PDF (microservice Puppeteer) et Excel (OpenPyXL) ;
modules M2 / M3 ; multi-attributs et intersectionnel ; seuils configurables par org ;
métriques à labels vrais (Equal Opportunity / Equalized Odds) ; gestion d'équipe ;
boutons SSO (Google/Microsoft/SAML) restent des stubs visuels.

## 2. Architecture (couches, périmètre slice)

```
apps/api/app/
├── core/           config · db (SQLAlchemy async) · security (JWKS Supabase)
│                    · errors (RFC 7807) · logging (structlog) · deps
├── models/         organizations · users · datasets · audits · audit_results
├── schemas/        DTOs Pydantic (extra = "forbid")
├── audit_engine/   PUR, zéro I/O — m1_supervised.py + common/ (validation, metrics)
├── services/       dataset_service · audit_service (orchestration) · dashboard_service
├── interpretation/ LLMProvider (ABC) · GeminiProvider · interpret_m1()
├── integrations/   supabase_storage · gemini · jwks
└── routers/        health · auth · datasets · audits · dashboard
migrations/         Alembic init + policies RLS
packages/shared-types   (DTO ↔ TS)
packages/prompt-bank    (m1_fr, versionné)
```

Le layering des ADR est respecté : **routers** = I/O et validation uniquement ;
**services** = orchestration (DB + storage + LLM), aucune logique mathématique ;
**audit_engine** = fonctions pures, `DataFrame + config → dict typé`, aucun I/O ;
**interpretation** = seule couche autorisée à appeler un LLM.

## 3. Modèle de données

| Table | Colonnes clés |
|---|---|
| `organizations` | id, name, settings jsonb (`llm_provider`, `di_threshold`=0.8, `retention_days`=30), created_at |
| `users` | id (= uid Supabase auth), org_id FK, email, first_name, role, created_at |
| `datasets` | id, org_id, uploaded_by, filename, storage_path, row_count, columns jsonb, status, created_at, **expires_at** (TTL rétention) |
| `audits` | id (`AUD-YYYY-NNN`), org_id, dataset_id FK, module=`M1`, title, status (pending/running/done/error), protected_attribute, decision_column, favorable_value, privileged_value (nullable), created_by, created_at, completed_at |
| `audit_results` | id, audit_id FK, metrics jsonb, verdict (pass/warn/fail), risk_score (int 0–100), interpretation jsonb (narrative, ai_act_anchors[], disclaimers[], provider, model), created_at |

Contrainte : toute ligne métier porte `org_id`. Voir §6 pour le RLS vs scoping applicatif.

## 4. Flux d'un audit M1 (synchrone)

1. Connexion via Supabase Auth (cookies, `@supabase/ssr`).
2. `/app/audits/nouveau` : dépôt CSV → `POST /datasets` (multipart).
   Le service téléverse vers Storage (bucket `datasets`, chemin `{org_id}/{dataset_id}.csv`),
   parse en-têtes + nombre de lignes avec pandas, fixe `expires_at = now + retention_days`,
   renvoie `{ dataset_id, columns[] }`.
3. Mapping des colonnes → `POST /audits` avec
   `{ dataset_id, title, protected_attribute, decision_column, favorable_value, privileged_value? }`.
4. `audit_service` (dans la requête HTTP) : crée la ligne `audits` (status=running) →
   télécharge le CSV depuis Storage → `audit_engine.run_m1(df, config)` (pur) →
   `interpretation.interpret_m1(result)` (Gemini ; fallback déterministe si échec) →
   persiste `audit_results` → status=done → renvoie le résultat.
5. Page résultat `/app/audits/[id]` : jauge + DI/DP + table par groupe + narratif +
   ancrages AI Act + disclaimer.
6. `GET /dashboard/summary` agrège les vrais audits de l'org → KPIs, jauge (score de
   risque org), audits récents, alertes (audits fail/warn), répartition par module.
   Le hook `useDashboard` remplace les mocks dans `apps/web/app/app/page.tsx`.

## 5. Moteur M1 (pur, testé en TDD)

**Entrée** : `pandas.DataFrame` + `M1Config{ protected_attribute, decision_column,
favorable_value, privileged_value? }`.

**Validation** (lève `DatasetValidationError`) :
- la colonne protégée et la colonne de décision existent ;
- la décision est binaire (2 valeurs distinctes non nulles, ou mappable favorable/défavorable) ;
- l'attribut protégé a ≥ 2 groupes ;
- garde-fou effectifs : `warn` consigné si un groupe a n < 30 ; erreur si n < 5.

**Calculs** :
- `selection_rate(g) = P(decision = favorable | attr = g)` par groupe ;
- référence = `privileged_value` si fourni, sinon le groupe au taux de sélection max ;
- **Disparate Impact** par groupe = `sr(g) / sr(ref)` ; on remonte le pire (min) + la table par groupe ;
- **Demographic Parity difference** = `max(sr) − min(sr)`.

**Verdict** (seuils constants v1, surchargeables par org plus tard) :
`DI ≥ 0.80 → pass` · `0.60 ≤ DI < 0.80 → warn` · `DI < 0.60 → fail`.

**risk_score** : mapping déterministe documenté à partir du pire DI et du déséquilibre
des effectifs → entier 0–100 (alimente la jauge dashboard).

**Sortie** : dataclass typée `M1Result{ groups:[{value,n,selection_rate}],
reference_value, disparate_impact, demographic_parity_diff, worst_group, verdict,
risk_score, warnings[] }`. **Aucun I/O, aucun LLM.**

**Fixtures de test** (TDD, écrites avant l'implémentation) :
- cas recrutement type mocks (DI ≈ 0.72, verdict fail) ;
- cas parfaitement équitable (DI = 1.0, verdict pass) ;
- cas limite warn (DI ≈ 0.70) ;
- dégénérés : un seul groupe (erreur), décision non binaire (erreur),
  groupe minuscule n < 5 (erreur), n < 30 (warning).

## 6. Couche interprétation

`LLMProvider` (ABC) : `complete(prompt, *, json=False) -> str`.
`GeminiProvider` : implémentation via `google-genai`, modèle depuis l'env.
Mistral non implémenté dans cette slice mais l'interface est prête.

`interpret_m1(result, context) -> Interpretation` : construit le prompt depuis le
template versionné `packages/prompt-bank/m1_fr` (consignes : FR vulgarisé pour
non-spécialistes, citer AI Act art. 10/13/15 + règle des 4/5, **jamais** de
formulation absolue type « certifié conforme / garanti / 100 % », toujours des
limites). Renvoie `{ narrative, ai_act_anchors[], disclaimers[], provider, model }`.

**Résilience (pas d'échec silencieux)** : l'appel LLM est encapsulé ; en cas de
timeout / erreur / quota, on génère un narratif **déterministe templé** à partir des
métriques et on marque `provider="fallback"`. Le LLM ne bloque jamais ni ne fait
échouer l'audit ; l'usage du fallback est **explicite** dans le résultat persisté.

## 7. Auth (réelle minimale)

**Web** : Supabase Auth email/mot de passe via `@supabase/ssr`. Pages `connexion` et
`inscription` câblées (les boutons SSO restent visuels, hors scope). Session en
cookies. Middleware (`proxy.ts`) protège `/app/*`. À l'inscription : création des
lignes `organizations` + `users` (1 org par utilisateur en v1, gestion d'équipe
reportée).

**API** : `core/security.py` vérifie le JWT Supabase (RS256) contre le JWKS Supabase
(cache en mémoire). `deps.get_current_user` charge la ligne `users` à partir de l'uid
→ fournit `current_user` avec `org_id`.

**Décision actée (→ ADR 0002)** : l'API se connecte à Postgres en direct (rôle
`postgres`), donc la RLS Supabase fondée sur `auth.uid()` **ne s'applique pas** sur ce
chemin. En v1, l'isolation par organisation est **garantie au niveau de la couche
service** : chaque requête est filtrée par `current_user.org_id` (sécurité réelle et
testée). Les politiques RLS sont **quand même écrites** dans la migration comme défense
en profondeur pour tout accès Supabase direct. Le web ne touche Supabase que pour
l'auth, jamais pour les données (toutes via l'API).

## 8. Gestion d'erreurs

Enveloppe type RFC 7807 : `{ type, title, status, detail, fields? }`, handlers
d'exception centraux. `DatasetValidationError` → 422 (avec `fields`) ;
erreur d'auth → 401 ; ressource absente → 404 ; SlowAPI → 429.
Échec LLM → **n'est pas une erreur** (fallback, cf. §6).
Logs structlog JSON, **jamais de PII** : on consigne formes et compteurs
(noms de colonnes, nombre de lignes, tailles de groupes), jamais le contenu des cellules.

## 9. Stratégie de test

- **Engine** : pytest unitaire, TDD-first, fixtures du §5, couverture élevée (code pur).
- **Services** : tests async sur Postgres de test (transaction par test) ;
  Supabase Storage et `LLMProvider` mockés (respx pour httpx, provider faké via l'interface).
- **Routers** : tests httpx ASGI, override de la dépendance d'auth, assertions sur les
  formes RFC 7807.
- **Web** : vitest + Testing Library — form upload/mapping, hook `useDashboard`,
  rendu de la page résultat (Axios mocké).
- **E2E manuel** : inscription → upload CSV exemple → audit M1 → résultat + dashboard.

## 10. Séquence de construction (approche A)

1. `git init` dans `projet/auditiq`, remote `https://github.com/Franck-F/Projet_AuditIQ.git`,
   commit baseline du scaffold + commit de ce spec.
2. `packages/shared-types` + `packages/prompt-bank` ; gel du contrat DTO / esquisse OpenAPI.
3. **`audit_engine` M1 pur + tests TDD** ← dérisque le cœur.
4. `core/` (config, db, errors, logging, security/JWKS) + migration Alembic initiale
   + models + SQL RLS.
5. `services` + `integrations` (storage, gemini) + `interpretation` (+ prompt-bank,
   fallback LLM) + tests de services.
6. `routers` + wiring `app.main` + tests routers ; OpenAPI vérifié vs contrat gelé.
7. Web : auth Supabase (connexion/inscription/middleware), client Axios + injection JWT,
   provider TanStack Query.
8. Web : `/app/audits/nouveau` (upload + mapping), `/app/audits/[id]` (résultat),
   remplacement des mocks par `useDashboard`.
9. Passe E2E + mise à jour README/docs + **ADR 0002** (décision RLS vs scoping applicatif).

## 11. Critères d'acceptation

- Un utilisateur s'inscrit, se connecte, et accède à `/app` (routes protégées).
- Upload d'un CSV → colonnes détectées → audit M1 lancé → résultat affiché avec
  DI, DP, table par groupe, verdict, narratif FR et ancrages AI Act.
- Le cas recrutement (DI ≈ 0.72) produit un verdict `fail` et une alerte au dashboard.
- Le dashboard n'importe plus `lib/mocks/dashboard.ts` : KPIs, jauge, audits récents,
  alertes et répartition par module proviennent de `GET /dashboard/summary`.
- Un échec Gemini ne casse pas l'audit : le résultat est produit avec
  `provider="fallback"` et un narratif déterministe.
- Isolation par org vérifiée par test : un utilisateur ne voit aucune donnée d'une
  autre organisation.
- `pnpm typecheck`, `pnpm lint`, `pnpm test` (web) et `pytest`, `ruff`, `mypy` (api) verts.
