# AuditIQ — Spécification d'implémentation (handoff Claude Code)

> Ce document est le contrat de développement du SaaS AuditIQ.
> Il complète **`DESIGN.md`** (système visuel, palette, typographie, composants) et la maquette HTML statique livrée dans ce projet (24 fichiers marketing + 14 fichiers application).
> La maquette est la **source de vérité visuelle** : tout ce qui est ambigu ici se résout en regardant les fichiers HTML existants.

---

## 1. Mission & contraintes produit

### 1.1 Promesse
> **Détectez et documentez les biais de vos systèmes d'IA en moins d'une heure, sans écrire une ligne de code.**

AuditIQ est un outil de **première ligne** : il détecte, explique, alerte et documente. Il ne corrige **pas** les modèles, ne délivre **pas** de certificat de conformité.

### 1.2 Utilisateurs cibles
- Responsable conformité / DPO (utilisateur primaire de la copy réglementaire)
- Responsable RH / Innovation (utilisateur primaire des audits M1 et M3)
- Direction (lecteur des rapports executive summary)
- Équipe data / IT (configurateur des intégrations)

### 1.3 Contraintes non-négociables
- **Souveraineté FR/UE** : hébergement UE, données client hors USA, sous-traitants documentés.
- **Auditabilité** : toute action significative doit produire une entrée dans le `audit_log` (immuable, append-only, horodatée).
- **Traçabilité des rapports** : chaque rapport généré doit avoir un hash SHA-256 horodaté + signature eIDAS optionnelle.
- **Disclaimer juridique** : tous les écrans qui présentent des résultats ou recommandations doivent rappeler que l'outil n'est pas un certificat de conformité.
- **Réversibilité** : suppression de compte = export RGPD + purge sous 30j avec preuve.
- **Accessibilité** : WCAG 2.2 AA minimum (contraste, focus visible, navigation clavier complète, ARIA correct sur les composants custom — gauge, feu tricolore, heatmap).

---

## 2. Stack technique

### 2.1 Stack recommandée (à confirmer avec l'équipe)
| Couche | Choix | Raison |
|---|---|---|
| Framework | **Next.js 15 (App Router) + React 18** | SSR, RSC, edge où pertinent, écosystème mature |
| Langage | **TypeScript strict** | Sûreté sur les contrats fairness/réglementaires |
| Style | **Tailwind CSS** + tokens CSS variables (cf. `assets/tokens.css`) | Reproduction fidèle de la maquette |
| State | **TanStack Query** (server state) + **Zustand** (UI state local) | Pas de Redux, pas de Context custom |
| Forms | **React Hook Form** + **Zod** | Validation typée, partagée client/server |
| ORM | **Drizzle ORM** + **Postgres 16** | Migrations versionnées, typesafe, perf |
| Auth | **NextAuth v5 (Auth.js)** ou **Clerk** | SSO SAML/OIDC requis pour Enterprise |
| Background jobs | **Inngest** ou **BullMQ + Redis** | Audits asynchrones (peuvent durer 5-30 min) |
| Stockage objets | **S3-compatible UE** (Scaleway, OVH, Cellar) | Datasets + rapports PDF |
| LLM / Embeddings (pour M3) | **Mistral Large** + **Mistral Embed** | Souveraineté FR/UE |
| Calcul fairness (M1, M2) | **Python service** (FastAPI) + **Fairlearn** + **scikit-learn** | Métriques fairness éprouvées |
| PDF | **react-pdf** ou **Puppeteer + template HTML** | Réutilise les maquettes |
| Excel | **exceljs** | Multi-feuilles avec mise en forme |
| Observabilité | **Sentry** + **Axiom/Better Stack** + **OpenTelemetry** | Logs structurés + traces |
| Email | **Resend** (UE-only routes) | Vérification, invitations, alertes |
| Paiement | **Stripe Billing** | Plans Starter / Équipe / Enterprise |
| Déploiement | **Vercel** (front Next.js) + **Scaleway/OVH** (workers Python + Postgres + Redis + S3) | Hybride pour souveraineté |
| CI | **GitHub Actions** | Lint, typecheck, tests, build, e2e |

### 2.2 Stack alternative "100 % souverain"
Si la souveraineté est un blocker commercial : Next.js déployé sur **Clever Cloud** ou **Scaleway Serverless**, Postgres managé Scaleway, Redis géré, S3 Scaleway. Pas de Vercel.

---

## 3. Architecture

### 3.1 Topologie
```
                       ┌──────────────────────┐
                       │   Marketing site     │   (SSG + ISR)
                       │   Next.js (public)   │   landing, produit, tarifs, blog…
                       └──────────┬───────────┘
                                  │
                       ┌──────────▼───────────┐
                       │   App Next.js (SSR)  │   auth, dashboard, modules
                       │   /app/* protégé     │
                       └──────────┬───────────┘
                                  │  REST + tRPC interne
                       ┌──────────▼───────────┐
                       │   API Routes Next    │   CRUD, RBAC, exports
                       └──────────┬───────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
┌───────▼────────┐      ┌─────────▼────────┐      ┌────────▼─────────┐
│  Postgres 16   │      │  Inngest/BullMQ  │      │   S3-compatible  │
│  (Drizzle)     │      │  workers         │      │   datasets+pdf   │
└────────────────┘      └─────────┬────────┘      └──────────────────┘
                                  │
                        ┌─────────▼────────┐
                        │  FastAPI Python  │
                        │  fairlearn + LLM │
                        └──────────────────┘
```

### 3.2 Découpe répertoires (monorepo recommandé)
```
auditiq/
├── apps/
│   ├── web/                  # Next.js (marketing + app)
│   └── workers/              # FastAPI Python (fairness + LLM)
├── packages/
│   ├── ui/                   # Composants React partagés (Gauge, Stoplight, Heatmap…)
│   ├── tokens/               # CSS vars + Tailwind preset (depuis assets/tokens.css)
│   ├── db/                   # Schéma Drizzle + migrations
│   ├── fairness-types/       # Types partagés métriques (TS)
│   └── pdf/                  # Templates rapports react-pdf
├── docs/
│   ├── CLAUDE.md             # ce document
│   ├── DESIGN.md             # système visuel (déjà livré)
│   └── adr/                  # Architectural Decision Records
└── .github/workflows/
```

---

## 4. Design system — binding

### 4.1 Source de vérité
- **Tokens** : `assets/tokens.css` (à copier dans `packages/tokens/` → exposer en Tailwind preset).
- **Composants visuels** : `assets/components.css` et `assets/app.css` documentent toutes les classes utilisées dans la maquette. Reproduire en React/Tailwind 1:1.
- **Charte typographique et chromatique** : `DESIGN.md`.

### 4.2 Composants signature à porter en premier (priorité MVP)
| Composant | Fichier maquette de référence | Notes |
|---|---|---|
| `<Stoplight />` (feu tricolore) | `app-audit-m1.html` (header résultats) | Variantes : `pass` / `warn` / `fail`. Accessible (rôle status + aria-label). |
| `<Gauge />` (jauge de risque) | `app-dashboard.html` (top-left) | Valeur 0–100, segments colorés, accessibilité : `role="meter"`. |
| `<MetricCard />` | `app-dashboard.html` (4 KPI row) | Label + valeur tabular-nums + delta + sparkline. |
| `<Sparkline />` | inline dans `MetricCard` | SVG inline, pas de lib externe. |
| `<StatusBadge />` | partout | `pass` / `warn` / `fail` / `info` / `neutral`. |
| `<RatioBar />` (comparaison groupes) | `app-audit-m1.html` | Barre horizontale avec seuil 4/5. |
| `<HeatMap6Axes />` | `app-audit-m3.html` | 6 axes biais LLM. |
| `<ClusterMap />` | `app-audit-m2.html` | Projection 2D + clusters cliquables. |
| `<DiffViewer />` | `app-audit-m3.html` | Côte à côte prompts pairs. |
| `<WizardStepper />` | `app-onboarding.html`, modules | Stepper persistant + progress. |
| `<DropZone />` | `app-audit-m1.html` (upload) | Drag-drop + validation MIME + preview. |
| `<DataTable />` | `app-rapports.html`, `app-historique.html` | Tri, filtres, pagination, sticky header. |
| `<RegulatoryCallout />` | `app-rapport.html` | Bloc article AI Act / droit FR avec icône balance. |
| `<ToastStack />` | `app-etats.html` | Bottom-right, auto-dismiss, action. |
| `<Modal />` (suppression, confirmation) | `app-etats.html` | Confirm typing pour actions destructives. |
| `<TocSticky />` | `app-rapport.html` | Sommaire latéral synchronisé au scroll. |

### 4.3 Règles produit (tirées de la maquette)
- Couleur d'accent vert régulateur **uniquement** comme identité (logo, focus ring, lien actif, CTA primaire). **Jamais** en wash de fond.
- Chiffres : `font-variant-numeric: tabular-nums` partout (métriques, tableaux, scores).
- Mono (JetBrains Mono) : étiquettes techniques uppercase, IDs (`AUD-2026-014`), hashes, code postal_2.
- Pas d'emoji, pas d'icône à chaque heading, pas de gradient décoratif.

---

## 5. Modèle de données (Drizzle / Postgres)

### 5.1 Tables principales
```ts
// Identité
organizations { id, name, siren, plan, seats_max, created_at, settings_json }
users         { id, email, full_name, locale, mfa_enabled, last_login_at }
memberships   { id, org_id, user_id, role: 'owner'|'admin'|'auditor'|'viewer', status }
invitations   { id, org_id, email, role, token, expires_at, invited_by }

// Audits — racine polymorphique
audits {
  id, org_id, code, // ex: AUD-2026-014
  module: 'M1'|'M2'|'M3',
  status: 'draft'|'running'|'completed'|'failed'|'cancelled',
  title, owner_id, created_at, completed_at,
  risk_level: 'pass'|'warn'|'fail'|null,
  config_json,           // wizard inputs figés
  results_json,          // structure dépend du module (cf. §7)
  dataset_id, llm_target_id,
  duration_ms
}

// Datasets (M1, M2)
datasets {
  id, org_id, uploaded_by,
  filename, size_bytes, sha256,
  storage_key,                // s3://datasets/{org}/{id}.csv
  schema_json,                // colonnes + types détectés
  rows_count, status: 'uploaded'|'validated'|'rejected',
  pii_detected_json
}

// LLM targets (M3)
llm_targets {
  id, org_id, name, kind: 'api'|'webhook'|'manual',
  config_json,                // endpoint, headers chiffrés, modèle
  last_health_check_at, status
}

// Rapports
reports {
  id, org_id, audit_id, code, // RPT-2026-014
  format: 'pdf'|'xlsx',
  storage_key, sha256, generated_at, generated_by,
  signed_eidas, signature_payload_json
}

// Recommandations
recommendations {
  id, org_id, audit_id,
  priority: 'P1'|'P2'|'P3',
  title, body_md, effort_hours_estimate,
  status: 'open'|'in_progress'|'done'|'dismissed',
  assigned_to, regulatory_anchors_json, // articles AI Act / FR
  created_at
}

// Audit trail
activity_log {
  id, org_id, actor_id, action, target_type, target_id,
  metadata_json, ip, ua, occurred_at
}

// Notifications
notifications { id, org_id, user_id, kind, body_json, read_at, created_at }
alerts        { id, org_id, severity, title, body, related_audit_id, dismissed_at }

// Billing
subscriptions { id, org_id, stripe_customer, stripe_sub, plan, seats, status, current_period_end }
invoices      { id, org_id, stripe_invoice, amount_cents, paid_at, pdf_url }
```

### 5.2 Index obligatoires
- `audits (org_id, status, created_at desc)`
- `activity_log (org_id, occurred_at desc)`
- `memberships (user_id, status)`
- `datasets (org_id, sha256)` — pour déduplication

---

## 6. Routes / pages

### 6.1 Marketing (public, SSG + ISR)
| Route | Fichier maquette | Fidélité requise |
|---|---|---|
| `/` | `landing.html` | Pivot — haute |
| `/produit` | `produit.html` | Pivot — haute |
| `/comment-ca-marche` | `comment-ca-marche.html` | Haute |
| `/modules` | `modules.html` | Standard |
| `/cas-usage` | `cas-usage.html` | Standard |
| `/cas-usage/[slug]` | (à dériver) | Pages détail RH / Finance / SAV |
| `/ai-act` | `ai-act.html` | Pivot — haute |
| `/pme` | `pme.html` | Standard |
| `/tarifs` | `tarifs.html` | Pivot — haute |
| `/faq` | `faq.html` | Standard |
| `/a-propos` | `a-propos.html` | Standard |
| `/contact` | `contact.html` | Standard + form Resend |
| `/comparatif` | `comparatif.html` | Standard |
| `/temoignages` | `temoignages.html` | Standard |
| `/ressources` | `blog.html` | Standard + CMS (Sanity ou MDX) |
| `/ressources/[slug]` | `article.html` | Standard |
| `/connexion` | `connexion.html` | Auth |
| `/inscription` | `inscription.html` | Auth |
| `/mot-de-passe-oublie` | `mot-de-passe-oublie.html` | Auth |
| `/verification-email` | `verification-email.html` | Auth |
| `*` (404) | `404.html` | — |

### 6.2 Application (protégée par auth)
| Route | Fichier maquette | Modèle de chargement |
|---|---|---|
| `/app/onboarding` | `app-onboarding.html` | Multi-step, state local |
| `/app` | `app-dashboard.html` | RSC + streaming |
| `/app/audits` | `app-historique.html` | Server pagination |
| `/app/audits/nouveau?module=M1` | `app-audit-m1.html` (wizard) | Form state |
| `/app/audits/nouveau?module=M2` | `app-audit-m2.html` (wizard) | Form state |
| `/app/audits/nouveau?module=M3` | `app-audit-m3.html` (wizard) | Form state |
| `/app/audits/[id]` | `app-audit-m{1,2,3}.html` (résultats) | RSC + révalidation 30s tant que running |
| `/app/rapports` | `app-rapports.html` | Server pagination |
| `/app/rapports/[id]` | `app-rapport.html` | RSC |
| `/app/rapports/comparer?a=…&b=…` | (extension) | RSC |
| `/app/recommandations` | `app-recommandations.html` | RSC |
| `/app/equipe` | `app-equipe.html` | RSC + form invitation |
| `/app/parametres/entreprise` | `app-parametres.html` § entreprise | Form |
| `/app/parametres/audit` | … § audit | Form |
| `/app/parametres/seuils` | … § seuils | Form avec preview |
| `/app/parametres/rapports` | … § rapports | Form |
| `/app/parametres/integrations` | … § intégrations | Liste + connexions OAuth |
| `/app/parametres/securite` | … § sécurité | MFA, sessions, SSO |
| `/app/parametres/facturation` | … § facturation | Stripe portal |
| `/app/parametres/notifications` | … § notifications | Form |
| `/app/support` | `app-support.html` | RSC + form ticket |

### 6.3 API (Next.js Route Handlers)
```
POST   /api/v1/auth/*                  NextAuth
GET    /api/v1/me                      session + org context
POST   /api/v1/org/invitations         créer invitation
POST   /api/v1/datasets                upload signé S3 → enregistrement
GET    /api/v1/datasets/:id            métadonnées + schéma
POST   /api/v1/audits                  créer audit (M1|M2|M3) — déclenche worker
GET    /api/v1/audits/:id              statut + résultats
DELETE /api/v1/audits/:id              soft delete (admin/owner)
POST   /api/v1/reports                 générer PDF/XLSX depuis audit
GET    /api/v1/reports/:id/download    URL signée (15 min)
POST   /api/v1/llm-targets             créer cible LLM (test connexion)
POST   /api/v1/llm-targets/:id/health  ping
GET    /api/v1/recommendations
PATCH  /api/v1/recommendations/:id     statut, assigné
GET    /api/v1/activity                logs paginés (admin/owner)
POST   /api/v1/billing/portal          Stripe Customer Portal
```

---

## 7. Logique métier — modules d'audit

### 7.1 Module 1 — Audit supervisé classique
**Worker** : `workers/m1_supervised.py`
**Inputs** :
- `dataset_id`
- `target_column` (binaire ou multiclasse)
- `sensitive_attribute` (catégoriel : sexe, âge_bucket, origine, etc.)
- `model_predictions_column` (optionnel — si absent, on calcule sur la distribution observée)
- `metrics` : sous-ensemble de `['demographic_parity', 'equal_opportunity', 'equalized_odds', 'four_fifths_rule']`

**Calculs (avec Fairlearn)** :
```python
from fairlearn.metrics import (
    demographic_parity_ratio,
    equal_opportunity_difference,
    equalized_odds_difference,
)

# Demographic Parity (ratio) — règle des 4/5
dp = demographic_parity_ratio(y_true, y_pred, sensitive_features=A)

# Equal Opportunity (TPR par groupe)
eo = equal_opportunity_difference(y_true, y_pred, sensitive_features=A)

# Equalized Odds (max écart TPR et FPR)
eod = equalized_odds_difference(y_true, y_pred, sensitive_features=A)
```

**Output `results_json`** :
```json
{
  "global_status": "warn",
  "metrics": {
    "demographic_parity": { "value": 0.78, "status": "warn", "threshold": 0.80 },
    "equal_opportunity":  { "value": 0.85, "status": "pass", "threshold": 0.80 },
    "equalized_odds":     { "value": 0.12, "status": "pass", "threshold": 0.15 },
    "four_fifths_rule":   { "value": 0.72, "status": "fail", "threshold": 0.80 }
  },
  "groups": {
    "Femmes":  { "n": 218, "positive_rate": 0.42, "tpr": 0.71, "fpr": 0.18 },
    "Hommes":  { "n": 194, "positive_rate": 0.54, "tpr": 0.76, "fpr": 0.21 }
  },
  "confusion_matrices_by_group": { /* … */ },
  "natural_language_summary": "…"
}
```

**Seuils par défaut** (configurables par org dans `/app/parametres/seuils`) :
- 4/5 rule : `pass ≥ 0.80`, `warn ≥ 0.65`, `fail < 0.65`
- Demographic Parity : idem (ratio)
- Equal Opportunity diff : `pass ≤ 0.10`, `warn ≤ 0.20`, `fail > 0.20`

### 7.2 Module 2 — Détection non supervisée
**Worker** : `workers/m2_unsupervised.py`
**Approche** :
1. KMeans (k auto via silhouette) ou HDBSCAN sur features non-PII.
2. Pour chaque cluster, calculer la composition par feature dominante.
3. Détecter **proxies** : si une feature inoffensive (ex : code_postal_2, prénom_initiale) ségrégue ≥ 60 % d'un cluster, lever un drapeau "proxy possible".
4. Comparer chaque cluster au reste sur des features cibles → score de déviance.

**Output** :
```json
{
  "global_status": "warn",
  "clusters": [
    { "id": "C1", "size": 120, "deviance_score": 0.21, "dominant_features": [["age_bucket", "25-34", 0.62]] },
    { "id": "C3", "size": 81,  "deviance_score": 0.74, "dominant_features": [["code_postal_2", "93", 0.61]], "proxy_flag": true }
  ],
  "projection_2d": [ [x, y, cluster_id], ... ],   // pour ClusterMap
  "natural_language_summary": "…"
}
```

### 7.3 Module 3 — Audit LLM
**Worker** : `workers/m3_llm.py`
**Banque de prompts pairs** : versionnée en repo (`/packages/prompt-bank/v1/`), couvre 6 axes : genre, origine, âge, religion, handicap, orientation.
Chaque paire : `{ "neutral": "…", "marked": "…", "axis": "handicap" }`.

**Process** :
1. Pour chaque paire, appeler le LLM cible (config dans `llm_targets`) avec un timeout 30s.
2. Mesurer :
   - **Longueur** (diff caractères)
   - **Sentiment** (modèle sentiment FR — CamemBERT-base-finetuned)
   - **Refus** (heuristique + classif binaire)
3. Agréger par axe → score 0–5 (5 = aucun écart détecté, 0 = écart systématique).
4. Score global = moyenne pondérée des axes.

**Output** :
```json
{
  "global_score": 3.4,
  "global_status": "warn",
  "axes": {
    "genre":       { "score": 4.2, "status": "pass" },
    "origine":     { "score": 3.8, "status": "warn" },
    "age":         { "score": 4.0, "status": "pass" },
    "religion":    { "score": 3.5, "status": "warn" },
    "handicap":    { "score": 2.1, "status": "fail" },
    "orientation": { "score": 4.1, "status": "pass" }
  },
  "examples": [
    {
      "axis": "handicap",
      "prompt_neutral": "…",
      "prompt_marked":  "…",
      "response_neutral": "…",  // 812 caractères
      "response_marked":  "…",  // 312 caractères
      "delta": { "length_chars": -500, "sentiment_delta": -0.18, "refused": false }
    }
  ]
}
```

---

## 8. Auth & RBAC

### 8.1 Rôles & permissions
| Action | Owner | Admin | Auditeur | Spectateur |
|---|---|---|---|---|
| Lancer un audit | ✓ | ✓ | ✓ | — |
| Consulter audits/rapports | ✓ | ✓ | ✓ | ✓ |
| Exporter rapport | ✓ | ✓ | ✓ | — |
| Inviter membre | ✓ | ✓ | — | — |
| Modifier rôles | ✓ | ✓ | — | — |
| Supprimer audit | ✓ | ✓ | — | — |
| Modifier seuils/paramètres audit | ✓ | ✓ | — | — |
| Gérer facturation | ✓ | — | — | — |
| Voir journal d'activité | ✓ | ✓ | — | — |
| Supprimer l'organisation | ✓ | — | — | — |

### 8.2 Implémentation
- Middleware Next.js (`middleware.ts`) → vérifie session.
- Helper `requireRole(role, orgId)` côté Server Action.
- Route Handler API → vérifie `membership.role` avant chaque mutation.
- Tests : suite e2e RBAC obligatoire (Playwright + comptes de chaque rôle).

### 8.3 MFA & SSO
- TOTP pour tous les comptes (paramétrable par l'org : optionnel / obligatoire).
- SSO SAML/OIDC sur le plan Enterprise (Clerk ou WorkOS si NextAuth limité).

---

## 9. Conformité & sécurité

### 9.1 RGPD
- **Bases légales** : intérêt légitime (audit interne), exécution contrat (client).
- **Registre des traitements** : généré automatiquement depuis `activity_log` + exports.
- **DPA** : modèle signé en ligne (DocuSign ou équivalent UE) à l'inscription Enterprise.
- **Sous-traitants** : liste à jour publiée sur `/ressources/sous-traitants`.
- **Droit d'accès / portabilité** : export JSON + ZIP datasets via `/app/parametres/securite`.
- **Droit à l'effacement** : workflow 7 jours avec preuve cryptographique.

### 9.2 AI Act (Règlement UE 2024/1689)
La maquette cite déjà précisément les articles. Les rapports doivent générer :
- **Article 10** (Données et gouvernance des données) — pertinent pour M1/M2.
- **Article 13** (Transparence) — pertinent M3.
- **Article 15** (Précision, robustesse, cybersécurité) — pertinent M1.
- **Article 17** (Système de gestion de la qualité) — mention dans rapport.
- **Annexe IV** (Documentation technique) — gabarit dans `/packages/pdf/templates/regulatory.tsx`.

### 9.3 Droit français
- **Code du travail L.1132-1** : discrimination — rapports M1 RH.
- **Code pénal 225-1 et 225-2** : discrimination — rapports.
- **RGPD article 22** : décisions automatisées — disclaimer obligatoire sur tout audit M1.
- **Délibération DDD 2024-23** : recommandations Défenseur des droits — citée dans recommandations.

### 9.4 Sécurité technique
- TLS 1.3 only.
- Chiffrement au repos : AES-256-GCM côté DB (colonnes sensibles via pgcrypto ou app-level KMS).
- Datasets chiffrés côté S3 (SSE-KMS) + chiffrement client-side avant upload pour Enterprise.
- Secrets : Vault (HashiCorp) ou Doppler.
- Headers : CSP strict, HSTS, X-Frame-Options DENY, Referrer-Policy strict-origin.
- Audits SAST : `npm audit`, `gitleaks`, `semgrep` en CI.
- Pentest annuel externe.

---

## 10. Exports

### 10.1 Rapport PDF
- **Engine** : Puppeteer ou react-pdf (préférer Puppeteer si on réutilise les templates HTML).
- **Source** : page `/app/rapports/[id]/pdf` (route SSR sans chrome app, A4 portrait).
- **Watermark** : sur chaque page bas-droite — code rapport + hash SHA-256 court (8 chars).
- **Signature eIDAS** : optionnelle via prestataire (Yousign, Universign) — stocker payload dans `reports.signature_payload_json`.

### 10.2 Excel
- 4 feuilles minimum :
  1. Synthèse executive
  2. Métriques détaillées (table)
  3. Groupes et écarts
  4. Recommandations
- exceljs avec mise en forme (colonnes auto-sized, status pills colorées).

---

## 11. Background jobs

| Job | Trigger | Durée typique | Retry policy |
|---|---|---|---|
| `audit.run.m1` | POST /audits | 30 s – 2 min | 0 (échec → status `failed`) |
| `audit.run.m2` | POST /audits | 1 – 5 min | 0 |
| `audit.run.m3` | POST /audits | 5 – 30 min | Reprise depuis dernière paire si timeout |
| `report.generate` | POST /reports | 10 – 30 s | 3 (exponentiel) |
| `dataset.validate` | upload S3 → webhook | 5 – 30 s | 3 |
| `email.send` | events | < 5 s | 5 (Resend gère) |
| `cleanup.expired` | cron daily 03:00 UTC | variable | 1 |

---

## 12. Tests

### 12.1 Pyramide
- **Unit** (Vitest) : utils, parsers, validation Zod, calculs déterministes côté TS.
- **Unit Python** (pytest) : workers, math fairness — golden test sur 5 datasets de référence (UCI Adult, COMPAS, German Credit, Statlog, MEPS).
- **Integration** (Vitest + testcontainers Postgres) : routes API, RBAC, transactions.
- **E2E** (Playwright) : parcours critiques —
  - Inscription → vérification email → onboarding → premier audit M1 → rapport généré.
  - Invitation membre → acceptation → connexion → permission refusée sur action interdite.
  - Suppression compte → export → purge.
- **A11y** (Axe-core en e2e) : zéro violation sérieuse sur les écrans pivots.

### 12.2 Golden datasets fairness
Maintenir `tests/fixtures/golden/*.csv` avec valeurs attendues figées. Tout PR qui change un calcul doit régénérer + justifier.

---

## 13. i18n

- **Locale par défaut** : `fr-FR`.
- **Locales prévues** : `en-GB` (V2).
- **Lib** : `next-intl`.
- **Règles copy** :
  - Vouvoiement systématique.
  - Mixte (cf. brief) : institutionnel-pédagogique sur AI Act/réglementaire, clair-pro sur produit.
  - Glossaire centralisé dans `/packages/copy/glossary.fr.json` (DP, EO, EOdds, 4/5 rule…).

---

## 14. Roadmap d'implémentation phasée

### Phase 0 — Fondations (sprint 1-2)
- Monorepo, CI, Drizzle + migrations, NextAuth, Tailwind preset depuis tokens.
- Composants UI signature (Stoplight, Gauge, MetricCard, StatusBadge).
- Marketing : `/`, `/produit`, `/tarifs`, `/ai-act`, `/connexion`, `/inscription`.

### Phase 1 — MVP audit M1 (sprint 3-5)
- Auth complète + onboarding + dashboard (mock data initial).
- Upload dataset + validation + détection schéma.
- Worker M1 + résultats + export PDF.
- Recommandations basiques + activity log.

### Phase 2 — M2 + M3 (sprint 6-9)
- Worker M2 + ClusterMap.
- Worker M3 + DiffViewer + banque de prompts v1.
- Comparaison rapports.
- Équipe + invitations + RBAC complet.

### Phase 3 — Réglementaire & maturité (sprint 10-12)
- Rapport réglementaire complet (Annexe IV).
- Signature eIDAS optionnelle.
- Intégrations (Slack, Teams, webhook generic).
- SSO Enterprise.
- Stripe Billing + portail.

### Phase 4 — Industrialisation (sprint 13+)
- i18n EN.
- Mode hors-ligne pour datasets sensibles (worker installable).
- API publique + SDK Python.

---

## 15. Acceptance criteria — écrans pivots

### 15.1 Dashboard (`/app`)
- [ ] La gauge affiche un score 0–100 avec un libellé (`Pass / Warn / Fail`).
- [ ] Les 4 KPI affichent une valeur, un delta vs période précédente, et une sparkline 14j.
- [ ] Les alertes prioritaires sont triables par sévérité ; le clic mène à l'audit/rapport source.
- [ ] La liste "Audits récents" affiche au moins 5 entrées avec status pill et durée.
- [ ] Le CTA "Lancer un audit" ouvre le picker M1/M2/M3.
- [ ] Empty state si aucun audit (visuel cohérent avec `app-etats.html` § first-use).

### 15.2 Audit M1 résultats (`/app/audits/[id]` — module M1)
- [ ] Header avec feu tricolore global, code audit, owner, durée, dataset.
- [ ] 4 cartes métriques avec valeur, status, seuil applicable, tooltip pédagogique.
- [ ] Comparaison Hommes/Femmes (ou groupes détectés) avec barres de ratio et ligne 4/5.
- [ ] Matrices de confusion par groupe (cliquables → modal détail).
- [ ] Section "Détail Demographic Parity" avec formule + interprétation NL.
- [ ] Bouton "Exporter rapport" → modale format (PDF / Excel) + langue + signature.
- [ ] Bouton "Recommandations" → ouvre `/app/recommandations` filtré sur cet audit.

### 15.3 Audit M2 résultats — module M2
- [ ] Projection 2D des clusters (canvas/SVG), hover = tooltip cluster.
- [ ] Liste des clusters triée par score de déviance descendant.
- [ ] Drapeau "Proxy possible" visible sur les clusters avec ségrégation feature > 60 %.
- [ ] Détail cluster sélectionné : 3 features dominantes, comparaison portefeuille.

### 15.4 Audit M3 résultats — module M3
- [ ] Score global 0–5 + heatmap 6 axes.
- [ ] Axe critique surligné (`fail`) avec lien direct vers exemples.
- [ ] DiffViewer côte à côte : prompt neutre vs prompt marqué + réponse + métriques (longueur, sentiment, refus).
- [ ] 4 extraits significatifs minimum.

### 15.5 Rapport (`/app/rapports/[id]`)
- [ ] TOC sticky synchronisé au scroll.
- [ ] Tabs "Executive summary" / "Vue réglementaire".
- [ ] Ancrage réglementaire : articles AI Act + droit FR cliquables (lien vers source officielle Eur-Lex/Légifrance).
- [ ] 3 recommandations minimum avec priorité.
- [ ] Bloc signature : code rapport, hash SHA-256, horodatage, signataire.
- [ ] Disclaimer juridique en pied de page.
- [ ] Export PDF reproduit fidèlement la mise en page.

### 15.6 Onboarding (`/app/onboarding`)
- [ ] 5 étapes : bienvenue, profil PME, cas d'usage, checklist, tutoriel.
- [ ] Stepper persistant en haut, état sauvegardé en DB à chaque étape.
- [ ] L'utilisateur peut reprendre où il s'était arrêté.
- [ ] À la fin, redirection vers `/app` avec toast de bienvenue.

---

## 16. Observabilité & SRE

- **Logs** : structurés JSON, niveau `info` par défaut, `debug` activable par org en debug mode.
- **Traces** : OpenTelemetry sur toutes les routes API et workers ; correlation ID propagé.
- **Métriques métier** :
  - `audits.started`, `audits.completed`, `audits.failed` (par module)
  - `audit.duration` (histogramme par module)
  - `report.generated`, `report.downloaded`
  - `signups.completed`, `onboarding.completed`
- **Alertes Sentry** : sur tout échec worker, tout 5xx > 1 % sur 5 min.
- **SLO** :
  - Disponibilité 99.5 % (Starter), 99.9 % (Enterprise).
  - M1 < 2 min p95, M2 < 5 min p95, M3 < 15 min p95.

---

## 17. Conventions de code

- **Lint** : ESLint + Prettier (config partagée), Ruff côté Python.
- **Commits** : Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`).
- **PRs** : description + capture(s) écran si UI + checklist a11y/RBAC/tests.
- **Branches** : `main` (prod) ← `develop` (intégration) ← `feat/*` / `fix/*`.
- **Versioning** : semver sur les packages internes ; calver sur l'app (`2026.06.x`).

---

## 18. Ressources & références internes

- **Maquette HTML** : `index.html` (galerie launcher) → 38 fichiers HTML, source de vérité visuelle.
- **DESIGN.md** (livré) : système visuel complet (Supabase dark + accent vert régulateur AuditIQ).
- **`assets/tokens.css`** : variables CSS — à porter en Tailwind preset.
- **`assets/components.css`** + **`assets/app.css`** : implémentations CSS de référence pour chaque composant.

---

## 19. Questions ouvertes (à arbitrer avant Phase 0)

1. **Vercel vs Scaleway** pour le front Next.js — choix dépend des engagements de souveraineté commerciaux.
2. **Auth provider** — NextAuth (gratuit, plus de code) vs Clerk (payant, plus rapide). Clerk recommandé si time-to-market prioritaire.
3. **CMS pour `/ressources`** — MDX in-repo (simple, dev-driven) vs Sanity/Strapi (édito autonome). MDX recommandé jusqu'à 50 articles.
4. **Signature eIDAS** — Yousign (FR, qualifié) vs Universign — décision commerciale.
5. **LLM provider M3** — Mistral exclusif (souverain) ou multi-provider configurable par client (commercial mais expose hors UE) ?
6. **Banque de prompts M3** — open-source (ex. dérivé de BBQ, BOLD) ou propriétaire ? Implique licence + maintenance.

---

*Document à versionner avec le code. Toute évolution majeure de l'architecture doit être tracée en ADR dans `docs/adr/`.*
