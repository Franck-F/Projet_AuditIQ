# Spec — Incrément M2 (détection non supervisée) + couche rapport de conformité

- **Date** : 2026-05-16
- **Statut** : En revue (design arrêté, en attente validation utilisateur du spec écrit)
- **Projet** : AuditIQ (`apps/web` + `apps/api` + nouveau `apps/pdf`)
- **Source de vérité produit** : mémoire `docs/memoire_final (1).docx` §4.2.2–4.2.8
- **Approche de construction** : 1 — engine-first, par couches, unités isolées (identique à M1)

## 1. Objectif et contexte

La slice M1 (audit supervisé : Disparate Impact / Demographic Parity / règle des 4/5)
est livrée et validée end-to-end sur l'infra réelle. Cet incrément ajoute le
**Module 2 — détection non supervisée** (§4.2.4 du mémoire) et la **couche rapport
de conformité** transversale (§4.2.7).

M2 répond au paradoxe de l'article 10(5) de l'AI Act : les PME françaises sont
structurellement incapables de collecter les attributs sensibles qui alimentent M1
(encadrement CNIL / Défenseur des droits des statistiques ethniques). M2 renverse
la question : au lieu de comparer des groupes démographiques déclarés, on cherche
des **clusters de traitement** qui dévient de la moyenne, puis on les caractérise
a posteriori par leurs features dominantes (proxies potentiels). **Aucune donnée
sensible requise.**

### Périmètre — DANS

- Moteur M2 pur : StandardScaler → KMeans → taux positif par cluster → test du
  Khi-deux → clusters déviants → caractérisation post-hoc → feu tricolore + ancrage
  AI Act art. 9/10.
- Pré-check **IQR** (§4.2.8) : alerte pré-audit non bloquante sur déséquilibre de
  groupes / anomalies, **câblée pour M1 et M2**.
- Couche **rapport de conformité** : Excel (OpenPyXL, in-process) + PDF (microservice
  Node `apps/pdf` via Puppeteer). Transversale : fonctionne aussi pour les audits M1.
- Web : étape « choix de module » dans l'assistant, branche de configuration M2,
  page résultat M2, bouton de téléchargement de rapport, répartition M1/M2 au dashboard.

### Périmètre — REPORTÉ (hors de cet incrément)

Module 3 (audit LLM/chatbot) ; exécution asynchrone / APScheduler (audits
récurrents) ; multi-attributs & intersectionnel ; seuils configurables persistés
par org (ceux de M2 restent par-audit via « paramètres avancés ») ; gestion
d'équipe ; features catégorielles dans le clustering M2 (v1 = numériques
uniquement, non-numériques exclues avec warning).

## 2. Architecture (couches — ADR respectées)

```
apps/api/app/
├── audit_engine/
│   ├── unsupervised.py   # PUR : pipeline M2 (KMeans + chi2 + caractérisation)
│   └── anomaly_iqr.py    # PUR : pré-check IQR partagé M1/M2
├── services/audit_service.py   # + run_m2_audit ; hook IQR dans run_m1 & run_m2
├── interpretation/m2.py        # interpret_m2() (Gemini + fallback déterministe)
├── reporting/
│   ├── excel.py          # OpenPyXL, in-process
│   └── pdf_client.py     # client httpx mince → microservice apps/pdf
├── schemas/               # union discriminée par `module` (M1 | M2) ; M2MetricsOut
├── routers/audits.py      # POST /audits (M1|M2) ; GET /audits/{id}/report.{pdf,xlsx}
├── migrations/            # 0002 : audits nullable + config jsonb ; table reports
packages/prompt-bank/m2_fr  # trame versionnée FR pour interpret_m2
apps/pdf/                   # NOUVEAU microservice Node (Puppeteer) HTML→PDF
apps/web/app/app/audits/    # assistant (étape module + config M2) + résultat + rapport
```

`audit_engine` reste **pur** (zéro I/O, TDD) ; `services` orchestre ;
`interpretation` est la seule couche autorisée à appeler un LLM ; `reporting` est
une **nouvelle couche transversale** qui consomme un `audit_results` déjà persisté
(donc utilisable pour M1 comme pour M2). Exécution **synchrone** dans la requête
HTTP, comme M1 (données PME modestes, KMeans rapide).

## 3. Modèle de données — migration `0002` (additive)

- `audits` : `protected_attribute` et `privileged_value` deviennent **nullable**
  (spécifiques M1 ; NULL pour M2). `decision_column` et `favorable_value` (existants)
  sont **réutilisés par M2** (`favorable_value` = valeur de décision positive). Ajout
  `config jsonb` = **extras M2 uniquement**, snapshot résolu de ce qui a tourné :
  `{features[], k, deviation_pp, chi2_alpha, random_state}` (NULL pour M1).
- `Settings` gagne `storage_bucket_reports` (env `STORAGE_BUCKET_REPORTS`, déjà
  présent dans `.env` ; lève le mismatch de nommage connu côté config — l'unique
  `storage_bucket` actuel ne couvrait que `datasets`).
- `audit_results.metrics jsonb` : **inchangé** (déjà libre) — accueille la sortie M2.
  `verdict` (pass/warn/fail), `risk_score` (0–100), `interpretation jsonb`
  (narrative, ai_act_anchors[], disclaimers[], provider, model) **réutilisés tels quels**.
- Nouvelle table `reports` : `id, audit_id FK, format ('pdf'|'xlsx'), storage_path,
  created_at`. Rapport généré à la demande, stocké dans Supabase Storage
  (bucket `reports`), mis en cache (régénéré seulement si absent) — traçabilité art. 11.
- RLS : politiques `no_direct_access` ajoutées pour `reports` ; scoping `org_id` au
  niveau service sur toute requête (cohérent ADR 0002).

## 4. Moteur M2 non supervisé (pur, TDD-first)

**Entrée** : `pandas.DataFrame` + `M2Config{ decision_column, positive_value,
feature_columns: list[str] | None = None, k: int = 5, deviation_pp: float = 20.0,
chi2_alpha: float = 0.05, random_state: int = 42 }`.
`feature_columns=None` ⇒ toutes les colonnes numériques sauf `decision_column`.

**Validation** (lève `DatasetValidationError`, mêmes conventions RFC 7807 que M1) :
- `decision_column` existe ; binaire (2 valeurs distinctes non nulles) ;
  `positive_value` présent dans la colonne.
- ≥ 2 colonnes de features **numériques** exploitables après exclusion de la
  décision ; colonnes non-numériques demandées ⇒ **exclues avec warning**.
- `2 ≤ k < n` ; effectifs : **erreur** si `n < 5·k` ou `n < 20` ; **warn** consigné
  si un cluster résultant a `n < 30`.
- Lignes avec NaN sur les features sélectionnées : **retirées**, nombre consigné en
  warning (déterminisme préservé, pas d'imputation en v1).

**Pipeline** (déterministe ; `random_state` figé — un audit doit être reproductible) :
1. Sélection des features numériques, drop des lignes NaN (compté).
2. `StandardScaler` (moyenne nulle, variance unitaire).
3. `KMeans(n_clusters=k, random_state=random_state, n_init=10)` — **sans** la
   variable de décision.
4. Taux de décision positive par cluster `p_c = P(decision = positive_value | cluster = c)` ;
   moyenne globale `p̄`.
5. `scipy.stats.chi2_contingency` sur la table de contingence `[cluster × décision]`
   → `chi2`, `p_value`, `dof`.
6. Clusters déviants : `|p_c − p̄| · 100 > deviation_pp`.
7. Caractérisation post-hoc : pour chaque cluster déviant, écart standardisé par
   feature `(mean_cluster − mean_global) / std_global` ; **top-3** par valeur
   absolue, avec direction (au-dessus / en-dessous).
8. **Verdict / feu tricolore** (mémoire §4.2.6) :
   - `fail` (rouge) : `p_value < chi2_alpha` **ET** ≥ 1 cluster déviant ;
   - `warn` (orange) : exactement une des deux conditions vraie (signal
     statistiquement significatif sans cluster > seuil, **ou** cluster > seuil mais
     `p_value ≥ chi2_alpha`) ;
   - `pass` (vert) : aucune des deux.
   `risk_score` : mapping déterministe piecewise calé sur les bandes de verdict
   (croît avec la significativité du chi², l'amplitude de déviation max et le nombre
   de clusters déviants) → entier 0–100 (alimente la jauge). Formule exacte figée
   dans le plan.

**Sortie** : dataclass typée immuable `M2Result{ n, k, global_positive_rate, chi2,
p_value, dof, clusters:[{id, n, positive_rate, deviation_pp, is_deviant,
top_features:[{name, std_diff, direction}]}], deviant_cluster_ids[], verdict,
risk_score, warnings[] }`. **Aucun I/O, aucun LLM.**

**Fixtures de test (TDD, écrites avant l'implémentation)** :
- cluster nettement déviant (un cluster fortement négatif → `p<0.05`, déviant → fail) ;
- données homogènes (aucune déviation, `p` élevé → pass) ;
- limite (déviation > 20 pts mais `p ≥ 0.05` → warn) ;
- dégénérés : < 2 features numériques (erreur), `n < 5k` (erreur), non-numériques
  exclues (warning), lignes NaN retirées (warning), feature constante (gérée :
  `std_global=0` → écart standardisé = 0, non retenue).

## 5. Pré-check IQR (pur, partagé M1/M2 — §4.2.8)

`anomaly_iqr.iqr_precheck(df, *, numeric_columns, group_column: str | None = None)
-> IqrReport{ warnings: list[str], details: list[dict] }`. **Non bloquant** :
n'empêche jamais l'audit, alerte seulement.

- `group_column` fourni (M1 : l'attribut protégé) ⇒ détecte le **déséquilibre de
  groupes** (plus petit groupe < 5 % du plus grand, ou `n < 30` absolu).
- `group_column=None` (M2) ⇒ **outliers de features** par règle de Tukey
  (`[Q1 − 1.5·IQR, Q3 + 1.5·IQR]`) signalés si > 5 % des lignes d'une feature, +
  contrôle de base-rate de la décision.

Intégration : `audit_service.run_m1` et `run_m2` appellent `iqr_precheck` **avant**
le moteur ; les warnings sont attachés au résultat (`AuditOut.pre_check: list[str]`)
et affichés en bannière web. Pur, testé unitairement.

## 6. Service, router, interprétation

- `POST /audits` : corps en **union discriminée par `module`** (Pydantic v2,
  `extra="forbid"` conservé). M1 inchangé. M2 :
  `{ dataset_id, title, module:"M2", decision_column, favorable_value,
  config?:{ features?, k?, deviation_pp?, chi2_alpha? } }` — `decision_column` et
  `favorable_value` réutilisent les colonnes existantes ; le service mappe
  `favorable_value → M2Config.positive_value` (vocabulaire interne du moteur pur).
  L'upload dataset (`POST /datasets`) est **inchangé et réutilisé**.
- `audit_service.run_m2_audit` (synchrone dans la requête) : crée la ligne `audits`
  (`module=M2`, `status=running`, `config` jsonb) → télécharge le CSV depuis Storage
  → `iqr_precheck` → `audit_engine.unsupervised.run_m2(df, cfg)` (pur) →
  `interpretation.interpret_m2(result, context)` → persiste `audit_results` →
  `status=done` → renvoie `AuditOut`.
- `interpret_m2(result, context) -> Interpretation` : prompt depuis
  `packages/prompt-bank/m2_fr` (FR vulgarisé pour non-spécialistes ; expliquer
  clusters / déviation / risque de proxy ; citer **AI Act art. 9** (gestion des
  risques) **et 10** (qualité des données) + note proxies **L.1132-1** ; **jamais**
  de formulation absolue ; **toujours** des limites « signal à approfondir, pas une
  preuve »). **Même contrat de résilience que `interpret_m1`** : timeout / erreur /
  quota ⇒ narratif **déterministe templé** + `provider="fallback"` ; le LLM ne
  bloque jamais ni ne fait échouer l'audit. *(État réel : `GEMINI_API_KEY` vide ⇒
  c'est le fallback déterministe qui s'exécute — comportement attendu.)*
- DTO : `AuditOut.metrics` devient `M1MetricsOut | M2MetricsOut` ; ajout
  `pre_check: list[str]` et `config` renvoyé.

## 7. Couche rapport de conformité (transversale M1/M2)

- `reporting/excel.py` (OpenPyXL, in-process, testable) : classeur — onglet résumé
  exécutif (feu global + risk_score), onglet détail du module exécuté, onglet
  ancrages (mise en regard métrique ↔ article AI Act 9/10/11 + droit FR), onglet
  limites/disclaimers.
- `apps/pdf` — **nouveau microservice Node (Puppeteer)** : endpoint unique
  `POST /render { html } -> application/pdf`, protégé par en-tête secret partagé
  (`PDF_SERVICE_SECRET`, déjà dans `.env`). Sans état. Test minimal propre (render
  renvoie un PDF ; secret exigé).
- `reporting/pdf_client.py` : client httpx mince → `PDF_SERVICE_URL` (déjà dans
  `.env`). L'API construit le **HTML du rapport** depuis une trame serveur
  (réutilise narratif d'interprétation + métriques + visuels). Échec microservice
  ⇒ RFC 7807 **502 non silencieux** (« rapport PDF momentanément indisponible ») ;
  l'Excel reste disponible et l'audit lui-même n'est pas affecté.
- Endpoints `GET /audits/{id}/report.xlsx` et `GET /audits/{id}/report.pdf`
  (org-scoped) : génère à la demande → stocke bucket `reports` + ligne `reports` →
  re-sert depuis le cache si déjà généré → renvoie le binaire (ou URL signée TTL).
- Trame (§4.2.7) : résumé exécutif (feu global), détail du module exécuté + visuels,
  références droit FR (CNIL, Code travail L.1132-1, Défenseur des droits, ACPR),
  section conformité métrique ↔ article AI Act. Mention explicite **« ce n'est pas
  un certificat »** en première page **et** en pied de page (principe produit ;
  jamais de formulation absolue).

## 8. Web

- `/app/audits/nouveau` : ajout d'une **étape « choix de module »** (M1 « audit
  supervisé » / M2 « détection non supervisée »). Branche M2 : colonne de décision
  + valeur positive ; **« paramètres avancés »** repliables (k, déviation pp,
  chi2_alpha, sous-ensemble de features) — défauts documentés (mémoire §4.2.6).
- `/app/audits/[id]` : rendu **M2** si `module=M2` — feu tricolore, p-value du chi²,
  table des clusters (effectif, taux positif, déviation, déviants en surbrillance),
  caractérisation post-hoc top-3 en langage naturel, **bannière pré-check IQR**,
  narratif + ancrages AI Act + disclaimers, action **« Télécharger le rapport »**
  (PDF / Excel).
- Dashboard : audits M2 dans les mêmes KPIs / récents / alertes ; répartition par
  module = M1 vs M2.

## 9. Gestion d'erreurs

Enveloppe RFC 7807, handlers centraux (réutilisés de M1). `DatasetValidationError`
→ 422 (`fields`) ; auth → 401 ; absent → 404 ; SlowAPI → 429 ; microservice PDF
indisponible → **502 non silencieux** (Excel reste servi). Échec LLM →
**n'est pas une erreur** (fallback explicite). Logs structlog JSON, **jamais de
PII** : on consigne formes et compteurs (noms de colonnes, tailles de clusters,
p-value), **jamais** le contenu des cellules ni les caractéristiques individuelles.

## 10. Stratégie de test

- **Engine M2 + IQR** : pytest unitaire, TDD-first, fixtures §4 et §5, couverture
  élevée (code pur, déterministe via `random_state`).
- **Services** : tests async sur Postgres de test (transaction par test) ; Storage
  et `LLMProvider` mockés ; `pdf_client` mocké (respx).
- **Routers** : httpx ASGI, override de la dépendance d'auth, assertions RFC 7807,
  union discriminée M1/M2, endpoints rapport.
- **`apps/pdf`** : test minimal du microservice (render → PDF ; secret exigé).
- **Web** : vitest + Testing Library — étape module de l'assistant, config M2,
  rendu page résultat M2, bouton rapport.
- **E2E manuel + smoke live** : réutilise le harnais `C:/tmp/auditiq_smoke.py`
  (pattern admin-create-user → token → flux) étendu à M2 + téléchargement
  PDF/Excel contre Supabase réel.

## 11. Séquence de construction (engine-first, comme M1)

1. `audit_engine/unsupervised.py` + `anomaly_iqr.py` + tests TDD.
2. Migration `0002` (audits nullable + `config jsonb` ; table `reports` + RLS).
3. Schemas / DTO (union discriminée `module`, `M2MetricsOut`, `pre_check`).
4. `interpretation/m2.py` + `packages/prompt-bank/m2_fr` + fallback déterministe.
5. `audit_service.run_m2_audit` + hook IQR dans `run_m1`/`run_m2` + wiring router
   + tests services/routers.
6. `reporting/excel.py` + microservice `apps/pdf` (Puppeteer) +
   `reporting/pdf_client.py` + endpoints rapport + tests.
7. Web : étape module + config M2, page résultat M2, téléchargement rapport,
   répartition module au dashboard.
8. **ADR 0003** (architecture M2 + couche rapport ; réaffirme Puppeteer per
   ADR 0001) ; mise à jour README/docs ; annexe de réconciliation mémoire (§13).
9. Passe E2E + smoke live.

## 12. Critères d'acceptation

- Un audit M2 sur un CSV **sans aucun attribut sensible** produit : clusters, taux
  positif par cluster, `chi2`/`p_value`, clusters déviants, caractérisation post-hoc
  top-3, verdict (feu), narratif FR + ancrages AI Act art. 9/10.
- Le pré-check IQR remonte une bannière non bloquante sur **M1 et M2**.
- Un rapport est téléchargeable en **PDF** (via microservice Puppeteer) **et Excel**,
  structuré AI Act art. 9/10/11, avec la mention « ce n'est pas un certificat ».
- Microservice PDF indisponible ⇒ 502 explicite, Excel toujours servi, audit intact.
- Échec Gemini ⇒ audit produit avec `provider="fallback"` et narratif déterministe.
- Isolation par org vérifiée par test (un user ne voit aucun audit/rapport d'une
  autre org).
- `pnpm typecheck|lint|test` (web), `pytest|ruff|mypy` (api), test microservice
  `apps/pdf` : tous verts.

## 13. Annexe — réconciliation du mémoire (action utilisateur)

Le mémoire §4.2.6 et §4.2.7 mentionne **ReportLab** pour le PDF ; l'implémentation
suit l'ADR 0001 (**microservice Puppeteer**). Wording corrigé à intégrer dans le
`.docx` (je ne modifie pas le mémoire moi-même) :

> §4.2.6 / §4.2.7 — remplacer « ReportLab » par : « un microservice Node dédié
> (`apps/pdf`) s'appuyant sur Puppeteer pour le rendu HTML→PDF ; OpenPyXL produit
> les rapports Excel côté FastAPI. »

Note connexe (hors périmètre, signalée) : le mémoire §4.2.2 décrit l'auth comme
« JWT / OAuth2 / Bcrypt » ; l'implémentation réelle utilise Supabase Auth +
vérification JWKS côté API. À harmoniser dans une révision ultérieure du mémoire.
