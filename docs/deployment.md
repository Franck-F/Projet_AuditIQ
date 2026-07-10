# Déploiement AuditIQ

3 services à déployer : **API** + **PDF microservice** sur Render
(Frankfurt, EU souveraineté), **Web** sur Vercel (CDN edge + previews
PR natifs). Total ~30 min de setup la première fois.

## 0. Ce déploiement — URLs réelles + dépannage

Services réellement déployés :

| Rôle | URL | Détail |
|---|---|---|
| **API** (Render) | `https://projet-auditiq.onrender.com` | service `srv-d932uj9kh4rs739d6l7g` |
| **Web** (Vercel) | `https://projet-audit-iq-pdf.vercel.app` | frontend Next.js |
| **PDF** (Render) | *(à confirmer / déployer)* | microservice Puppeteer |

### Câblage croisé — valeurs exactes à mettre dans les dashboards

- Vercel → `NEXT_PUBLIC_API_BASE_URL = https://projet-auditiq.onrender.com/api/v1`
- Render API → `API_CORS_ORIGINS = https://projet-audit-iq-pdf.vercel.app`
- Render API → `PDF_SERVICE_URL = https://<service-pdf>.onrender.com`

### Gotcha Render ↔ Supabase (cause n°1 d'un service qui ne démarre jamais)

Render n'a **pas d'IPv6 sortant**, or la connexion **directe** Supabase
`db.<ref>.supabase.co` est **IPv6-only**. Résultat : le `preDeployCommand`
(`alembic upgrade head`) et l'app **ne peuvent pas** atteindre la base, le
service reste bloqué "en démarrage" et ne répond jamais (timeout, 0 octet).

**Fix** : utiliser le **pooler Supavisor (IPv4)** en mode *session* pour
`SUPABASE_DB_URL` :

```
postgresql+asyncpg://postgres.<ref>:<motdepasse>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

(Supabase Dashboard → Project Settings → Database → **Connection pooling** →
chaîne "Session pooler". Bien noter le username `postgres.<ref>` et le port
**5432** — pas 6543, le mode transaction casse les migrations Alembic.)

### Supabase Network Restrictions (si activé)

Autoriser les IP sortantes Render : `74.220.50.0/24` et `74.220.58.0/24`.

## 1. Render — API + PDF (Infrastructure-as-Code via `render.yaml`)

### First-time setup

1. Sign in sur [render.com](https://render.com) avec ton compte GitHub.
2. **New +** → **Blueprint** → sélectionner `Franck-F/Projet_AuditIQ`.
   Render détecte le `render.yaml` racine et propose la création des
   2 services (`auditiq-api` + `auditiq-pdf`) + le groupe de secrets
   `auditiq-shared`.
3. Avant le premier deploy, remplir les secrets dans
   **Dashboard → Env Groups → auditiq-shared** :

   | Clé | Valeur (depuis ton `apps/api/.env` local) |
   |---|---|
   | `SUPABASE_URL` | `https://jiwexpgcfhnsugouzzvg.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_URL` | idem |
   | `SUPABASE_SERVICE_ROLE_KEY` | (service-role JWT) |
   | `SUPABASE_JWT_SECRET` | (le JWT secret legacy) |
   | `SUPABASE_DB_URL` | `postgresql+asyncpg://postgres:…@db.…:5432/postgres` |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | (publishable key) |
   | `GEMINI_API_KEY` | (clé Google AI Studio) |
   | `MISTRAL_API_KEY` | (clé Mistral, fallback) |
   | `PDF_SERVICE_URL` | `https://auditiq-pdf.onrender.com` *(connu après 1er deploy de PDF)* |

   `PDF_SERVICE_SECRET` est généré automatiquement par Render
   (`generateValue: true`) — pas besoin d'y toucher.

4. **Spécifique à `auditiq-api`** : dans son onglet **Environment**,
   ajouter aussi `API_CORS_ORIGINS=https://auditiq.vercel.app`
   (l'URL Vercel exacte ; tu pourras la mettre à jour après le 1er
   deploy Vercel).
5. Cliquer **Apply Changes** → Render build + deploy les 2 services
   (~3-5 min). Le `preDeployCommand` lance automatiquement
   `alembic upgrade head` sur la DB Supabase.

### URL résultantes

- API : `https://auditiq-api.onrender.com/api/v1/health` → `{"status":"ok"}`
- PDF : `https://auditiq-pdf.onrender.com/render` → 403 sans header
  `X-PDF-Secret` (preuve qu'il tourne)

### Previews PR

`previews.generation: automatic` sur les 2 services → Render spin-up
un env de preview par PR. URL : `auditiq-api-pr-<N>.onrender.com`.
Render commente la PR avec l'URL via le GitHub App Render
(activer la GitHub App une fois).

## 2. Vercel — Web (Next.js)

### First-time setup

1. Sign in sur [vercel.com](https://vercel.com) avec GitHub.
2. **Add New… → Project** → sélectionner `Franck-F/Projet_AuditIQ`.
3. Configuration :
   - **Root Directory** : `apps/web`
   - **Framework Preset** : Next.js (auto-détecté via `vercel.json`)
   - **Build Command** : `cd ../.. && pnpm --filter @auditiq/web build`
     (déjà dans `apps/web/vercel.json`, Vercel le pré-remplit)
   - **Install Command** : `cd ../.. && pnpm install --frozen-lockfile`
4. **Environment Variables** (onglet) — à renseigner pour
   Production + Preview + Development :

   | Clé | Valeur |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://jiwexpgcfhnsugouzzvg.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | (publishable key) |
   | `NEXT_PUBLIC_API_BASE_URL` | `https://auditiq-api.onrender.com/api/v1` |
   | `NEXT_PUBLIC_APP_URL` | `https://auditiq.vercel.app` *(ou ton domaine custom)* |

5. **Deploy**. ~2 min build + 30 s deploy. URL : `https://auditiq.vercel.app`
   (ou autre suivant le nom du projet).

### Previews PR

Activé par défaut côté Vercel (`github.silent: true` dans `vercel.json`
veut juste dire "ne commente pas chaque deploy en plus du PR" ; les
previews restent live à `auditiq-git-<branch>-<team>.vercel.app`).

### Custom domain (optionnel)

**Project → Settings → Domains** → ajouter `auditiq.fr` (ou autre) →
suivre les DNS records (CNAME ou A vers `cname.vercel-dns.com`).

## 3. Post-deploy — câblage croisé final

Après le 1er deploy des 2 plateformes, mettre à jour :

- **Render `auditiq-api` env `API_CORS_ORIGINS`** ←
  l'URL exacte Vercel production (ex.
  `https://auditiq.vercel.app,https://auditiq.fr`)
- **Render `auditiq-api` env `PDF_SERVICE_URL`** ←
  `https://auditiq-pdf.onrender.com` (l'URL exacte du PDF service)
- **Vercel env `NEXT_PUBLIC_API_BASE_URL`** ←
  `https://auditiq-api.onrender.com/api/v1`

Re-trigger un deploy sur chaque côté pour propager les variables.

## 4. Sanity check post-deploy

```bash
curl -fs https://auditiq-api.onrender.com/api/v1/health
# {"status":"ok"}

curl -fs https://auditiq.vercel.app/ | head -20
# Marketing landing (200 OK)

# Connexion + audit M1 end-to-end via la suite Playwright pointée
# sur l'environnement déployé :
echo 'WEB_BASE_URL=https://auditiq.vercel.app' >> apps/web/e2e/.env.e2e
pnpm --filter @auditiq/web e2e
```

## 5. Coûts (free tier)

| Service | Plan | Coût | Auto-sleep |
|---|---|---|---|
| Render `auditiq-api` | free | 0 € | Oui après 15 min inactif (cold start ~30 s) |
| Render `auditiq-pdf` | free | 0 € | Oui |
| Vercel `auditiq-web` | Hobby | 0 € | Non (toujours actif) |
| Supabase | Free | 0 € | DB pause après 7 j |
| **Total** | | **0 €/mois** | |

Pour production avec trafic réel : `plan: starter` Render (7 $/mo/service
= 14 $/mo) supprime le cold start ; Vercel Pro (20 $/mo) débloque
les seats équipe et analytics.

## 6. Rollback

- **Render** : Dashboard → service → onglet **Deploys** → clic
  **Rollback** sur n'importe quel deploy précédent. Inclut l'image
  build + les env vars de l'époque.
- **Vercel** : Dashboard → project → onglet **Deployments** →
  **Promote to Production** sur un deploy antérieur.
- **DB Supabase** : `uv run alembic downgrade <revision>` depuis ton
  poste (jamais via deploy automatique — manuel par sécurité).
