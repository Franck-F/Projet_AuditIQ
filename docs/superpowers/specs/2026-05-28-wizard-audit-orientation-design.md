# Wizard d'audit orienté — Design

**Date** : 2026-05-28
**Statut** : Brouillon — en attente de relecture utilisateur
**Auteur** : Franck F (via brainstorming Claude)

## 1. Contexte et motivation

Le formulaire de création d'audit actuel (`apps/web/app/app/audits/nouveau/page.tsx`) présente
tous les champs à plat avec des libellés techniques (« attribut protégé », « valeur favorable »,
« response_path », « privileged_value »...). L'utilisateur cible — un non-spécialiste, conformément
au principe produit #4 « Pédagogie d'abord » — doit deviner ce qu'on lui demande.

L'objectif de cet incrément : **orienter** le remplissage par un guidage pas-à-pas, une aide
contextuelle riche, et la détection automatique des colonnes du CSV. Trois leviers combinés.

**Pas dans le scope** : refonte visuelle (Topbar, palette), sauvegarde de brouillon entre
sessions, clonage d'audit précédent, mode expert.

## 2. Décisions cadres (validées en brainstorming)

| Décision | Choix retenu | Alternatives écartées |
|---|---|---|
| Type d'orientation | Combo : étapes + aide + détection | A) étapes seules B) aide seule C) détection seule |
| Périmètre | M1 + M2 + M3 | M1 d'abord ; M1+M2 seulement |
| Granularité | 5 étapes logiques par module | 1 question/étape ; 2-3 étapes minimaliste |
| Détection auto | Stats poussées (heuristiques + χ² + mutual info) | Heuristiques seules ; aucune détection |
| Test connexion M3 | Étape facultative | Obligatoire ; absente |
| Persistance brouillon | Hors scope | Save & resume cross-session |

## 3. Architecture

```
apps/api/
├── audit_engine/
│   └── dataset_analysis.py     [NEW]   run_dataset_analysis (pur, sans IO)
├── routers/
│   ├── datasets.py             [+1]    POST /datasets/{id}/analyze
│   └── audits.py               [+2]    POST /audits/m3/test-connection
│                                       POST /audits/m3/validate-url
├── services/
│   ├── dataset_service.py      [mod]   read/write analysis_cache
│   └── llm_test_connection.py  [NEW]   réutilise integrations/llm_target.py
└── migrations/
    └── versions/0007_*.py      [NEW]   ALTER TABLE datasets ADD analysis_cache JSONB

apps/web/
├── lib/wizard/
│   └── help-content.ts         [NEW]   STEP_HELP record + GLOSSARY
├── components/audits/wizard/
│   ├── WizardShell.tsx         [NEW]   barre progression, prev/next, slot HelpPanel
│   ├── HelpPanel.tsx           [NEW]   panneau latéral desktop / bottom-sheet mobile
│   ├── WizardContext.tsx       [NEW]   helpKey, current step, valeurs partagées
│   ├── m1/
│   │   ├── M1Wizard.tsx        [NEW]   orchestre Step1..Step5 M1
│   │   ├── Step1Context.tsx
│   │   ├── Step2Data.tsx              [enveloppe DatasetUploadCard existant + carte d'analyse]
│   │   ├── Step3Decision.tsx
│   │   ├── Step4Protected.tsx
│   │   └── Step5Review.tsx
│   ├── m2/    [NEW]            5 steps M2
│   └── m3/    [NEW]            5 steps M3 + TestConnectionStep
└── app/app/audits/nouveau/
    └── page.tsx                [mod]   réduit à ModuleChoice + <M{1|2|3}Wizard>
```

**Principe d'isolation** : chaque `StepN` connaît 1-3 champs + le contexte partagé via
`WizardContext`. `WizardShell` ne connaît pas le métier (juste collection d'étapes + état
d'avancement). `HelpPanel` lit `STEP_HELP[helpKey]` — pas de logique métier.

## 4. Composants détaillés

### 4.1 Engine de détection — `audit_engine/dataset_analysis.py`

Module pur, sans IO, testable indépendamment. Suit le pattern des autres modules de l'engine
(`unsupervised.py`, `llm_audit.py`).

```python
@dataclass(frozen=True)
class ColumnProfile:
    name: str
    dtype: Literal['numeric', 'categorical', 'boolean', 'text', 'datetime']
    unique_count: int
    null_ratio: float
    top_values: list[tuple[Any, int]]  # vide si unique_count > 50
    role_hint: Literal['decision', 'protected', 'identifier', 'feature', 'unknown']

@dataclass(frozen=True)
class Suggestion:
    column: str
    confidence: float  # [0, 1]
    reason: str        # français simple
    favorable_value: Any | None = None  # uniquement pour decision

@dataclass(frozen=True)
class DatasetAnalysis:
    columns: list[ColumnProfile]
    suggested_decision: Suggestion | None
    suggested_protected: Suggestion | None

def run_dataset_analysis(df: pd.DataFrame) -> DatasetAnalysis: ...
```

**Scoring décision** :
1. Filtre : `2 ≤ unique_count ≤ 10` ET `null_ratio < 0.3`
2. Score nom : +5 si match `^(decision|approved|outcome|class|target|label|result|status|y)$` (i)
3. Score stats : entropie normalisée + mutual information moyenne avec les autres colonnes
4. `score_final = 0.6 * score_nom_norm + 0.4 * score_stats_norm`
5. Top retenu si `score_final ≥ 0.3`, sinon `suggested_decision = None`
6. `favorable_value` suggérée = valeur **minoritaire** de la colonne décision (convention :
   la favorable est plus rare que la défavorable dans la plupart des modèles audités)

**Scoring attribut protégé** :
1. Filtre : `2 ≤ unique_count ≤ 20`
2. Score nom : +5 si match
   `^(sex|gender|genre|age|race|origin|origine|nationality|nationalité|ethni.*|religion|disability|handicap.*|orientation)$` (i)
3. Score stats : test du χ² d'indépendance avec la colonne décision suggérée — `-log10(p_value)`
   normalisé donne le score
4. `score_final = 0.6 * score_nom_norm + 0.4 * score_stats_norm`
5. `reason` toujours en français lisible : « Nom évocateur d'attribut sensible ; lien fort
   avec la décision détecté (χ², p<0.001) »

**Garde-fous** :
- `confidence < 0.3` → suggestion non affichée comme « Suggéré » ; juste position #1
- Si aucune colonne ne dépasse le seuil → `None` (UX honnête, pas de faux confort)

### 4.2 Endpoint analyse — `POST /api/v1/datasets/{id}/analyze`

```python
class DatasetAnalysisOut(BaseModel):
    columns: list[ColumnProfileOut]
    suggested_decision: SuggestionOut | None
    suggested_protected: SuggestionOut | None

@router.post("/{dataset_id}/analyze", response_model=DatasetAnalysisOut)
async def analyze_dataset(
    dataset_id: UUID,
    db: AsyncSession = Depends(get_db),
    org_id: UUID = Depends(get_org_id),
):
    dataset = await get_dataset(db, dataset_id, org_id)  # RLS org-scope
    if dataset.analysis_cache:
        return dataset.analysis_cache
    df = await download_and_load(dataset.storage_path)
    analysis = run_dataset_analysis(df)
    dataset.analysis_cache = analysis_to_dict(analysis)
    await db.commit()
    return analysis
```

- **Cache** : `datasets.analysis_cache` JSONB nullable (migration 0007)
- **RLS** : `org_id` (pattern existant)
- **Auth** : Supabase JWT (pattern existant)
- **Limites** : analyse synchrone ; pour 100k lignes ~1-3 s ; au-delà on documente la latence
  (pas d'optimisation prématurée)

### 4.3 Endpoint test connexion M3 — `POST /api/v1/audits/m3/test-connection`

```python
class M3TestConnectionIn(BaseModel):
    target: TargetConfig  # url, method, headers, body_template, response_path
    test_prompt: str = "Bonjour, peux-tu te présenter brièvement ?"

class M3TestConnectionOut(BaseModel):
    status: Literal['ok', 'error']
    elapsed_ms: int
    request_sent: dict
    response_raw: Any | None
    extracted_value: str | None
    error: str | None
```

Réutilise `integrations/llm_target.py` (SSRF-hardened, `assert_public_url`, timeout 30 s).
Le secret d'authentification n'est jamais persisté — même règle que `run_m3_audit`.

### 4.4 Endpoint validation URL M3 — `POST /api/v1/audits/m3/validate-url`

Léger, retourne 200/422 immédiatement (`assert_public_url(url)`). Permet de catcher
les URLs privées dès la saisie sans coût d'un appel LLM réel.

### 4.5 Système d'aide — `lib/wizard/help-content.ts`

```typescript
export type HelpKey =
  | 'm1.step1' | 'm1.step1.title'
  | 'm1.step2' | 'm1.step2.upload' | 'm1.step2.suggestions'
  | 'm1.step3' | 'm1.step3.decision_column' | 'm1.step3.favorable_value'
  | 'm1.step4' | 'm1.step4.protected_attribute' | 'm1.step4.privileged_value'
                | 'm1.step4.ground_truth_column' | 'm1.step4.secondary_protected_attribute'
  | 'm1.step5'
  | 'm2.step1' | ... | 'm2.step5'
  | 'm3.step1' | ... | 'm3.step5'
  ;

export type HelpEntry = {
  title: string;
  body: string;
  example?: string;
  learnMoreHref?: string;
};

export const STEP_HELP: Record<HelpKey, HelpEntry> = { ... };
```

**Test garde-fou (vitest)** : pour chaque clé exportée dans le type `HelpKey`, vérifier qu'une
entrée existe dans `STEP_HELP`. Empêche la dérive doc/code.

### 4.6 Composant `<HelpPanel />`

- **Desktop ≥ lg** : panneau fixe à droite, 320 px, sticky top
- **Mobile** : bottom-sheet déclenchée par bouton `?` à côté de chaque label, fermable au tap
- Rendu markdown via `react-markdown` (déjà dans le repo pour l'interprétation LLM)
- Encart « Exemple » distinct visuellement
- Lien « En savoir plus » → `/docs/...` (cible : `_blank`)

**Sélection de contenu** :
- À l'arrivée sur StepN → `helpKey = 'mX.stepN'` (aide générale de l'étape)
- Sur focus d'un champ → `helpKey = 'mX.stepN.field_name'` (aide précise)
- Sur blur → retour à `'mX.stepN'`

### 4.7 Étapes par module

#### M1 — 5 étapes

1. **Contexte** : `title`
2. **Données** : réutilise le composant existant `DatasetUploadCard` (PR #27 — drag-drop +
   onglets `Fichier` / `Exemples` / `Sources externes`). Une fois le dataset chargé (peu
   importe la source), affichage en-dessous d'un tableau d'aperçu (10 premières lignes)
   + une carte « Analyse automatique » qui appelle `POST /datasets/{id}/analyze`. Les
   datasets d'exemple (fournis avec l'app) peuvent avoir leur `analysis_cache` pré-calculé
   en base pour que les suggestions apparaissent instantanément.
3. **Décision à auditer** : `decision_column` (dropdown + badge « Suggéré » si applicable),
   puis `favorable_value` (dropdown peuplé avec valeurs uniques de la colonne sélectionnée,
   ≤ 10 valeurs sinon recherche)
4. **Attribut protégé** : `protected_attribute` (suggestion), options dépliables :
   `privileged_value`, `ground_truth_column`, `secondary_protected_attribute` chacune avec
   un mini-bloc d'explication
5. **Résumé & lancement** : récap visuel + liste des analyses qui seront produites
   (DI, 4/5, +EO si GT fournie, +intersectionnel si secondaire fourni), bouton « Lancer »

#### M2 — 5 étapes

1. **Contexte** : `title`
2. **Données** : idem M1
3. **Décision à auditer** : idem M1 (`decision_column`, `favorable_value`)
4. **Paramètres avancés** : repliable fermé par défaut, mention « Valeurs par défaut adaptées »,
   expose `k`, `deviation_pp`, `chi2_alpha`
5. **Résumé & lancement** : récap + liste (KMeans k=5, χ² par cluster, IQR pré-check)

#### M3 — 5 étapes

1. **Contexte** : `title`, `lang` (fr/en)
2. **API du chatbot** : `url` (avec validation immédiate via `/validate-url`), `method`,
   `auth_header` optionnel
3. **Format des requêtes** : dropdown preset (OpenAI-compatible / Personnalisé), pré-remplit
   `body_template` + `response_path`, mini-éditeur JSON pour `body_template`
4. **Tester la connexion** *(facultatif)* : bouton « Envoyer un prompt test », affichage
   3 cartes (Requête / Réponse brute / Extraction). Bouton « Sauter » toujours disponible.
   Test échoué = bandeau jaune non bloquant.
5. **Résumé & lancement** : récap + liste (12 paires, 6 catégories, deadline 45 s, métriques)

**Cohérence** : sur les 3 modules, étape 1 = nommer, étape 2 = source (données/API),
étapes 3-4 = configuration, étape 5 = résumé. Barre 5/5 partout.

**Navigation** : « Précédent » dispo à toutes les étapes sauf 1 ; « Suivant » désactivé tant
que l'étape n'est pas valide Zod ; clic sur étape passée dans la barre = retour libre.

## 5. Migration 0007

```sql
ALTER TABLE datasets ADD COLUMN analysis_cache JSONB;
```

Pas d'index — accès uniquement par `dataset_id` (PK déjà indexé).

## 6. Gestion des erreurs

| Situation | UX |
|---|---|
| `/analyze` échoue (CSV illisible) | Toast Step 2, message « On n'a pas pu analyser votre fichier. Vous pouvez continuer en sélectionnant manuellement. » Wizard continue, dropdowns peuplés depuis `dataset.columns`. |
| `/analyze` lent (>5 s) | Skeleton sur la carte « Analyse auto » ; bouton « Continuer sans attendre » après 8 s. |
| `createAudit` 422 | Wizard revient à l'étape concernée, highlight le champ fautif (mapping `error.loc` → step). Pas de toast générique. |
| `createAudit` 5xx | Bandeau d'erreur en haut, bouton « Réessayer » qui re-soumet sans perte d'état. |
| M3 URL privée (SSRF) | Validation Step 2 via `/validate-url` ; remontée immédiate dans le champ. |
| Refresh page en plein wizard | Pas de persistance. Bandeau si dataset déjà uploadé en DB : « Reprenez là où vous étiez. » Le dataset reste ; les champs sont perdus. |

## 7. Tests

**Backend (pytest)** — cible ~290 (depuis 277)
- `audit_engine/test_dataset_analysis.py` — 8-10 tests purs : heuristiques nom,
  scoring, edge cases (1 col, 0 ligne, constantes, NaN massif)
- `routers/test_datasets_analyze.py` — cache hit/miss, RLS cross-org, 404
- `routers/test_audits_m3_test_connection.py` — happy path, SSRF refus, response_path
  ne match pas, timeout
- `routers/test_audits_m3_validate_url.py` — URL publique OK, URL privée 422

**Frontend (vitest)** — cible ~50 (depuis 41)
- `wizard/M1Wizard.test.tsx` — navigation prev/next, validation par étape, suggestion
  appliquée, édition d'étape passée
- `wizard/HelpPanel.test.tsx` — changement de contenu sur changement de `helpKey`
- `wizard/help-content.test.ts` — chaque `HelpKey` a une entrée
- `wizard/m3/TestConnectionStep.test.tsx` — sauter, affichage 3 cartes, état error

**E2E (Playwright)** — cible 13 (depuis 10)
- `wizard-m1-guided.spec.ts` — navigation 5 étapes, suggestion auto appliquée,
  audit lancé, résultat visible
- `wizard-m2-guided.spec.ts` — idem M2
- `wizard-m3-guided.spec.ts` — incluant test-connexion réussi avec httpbin.org

**Régression** : tous les tests existants doivent rester verts.

## 8. Découpage en sous-projets (proposé pour la phase plan)

À confirmer par la skill writing-plans, mais probable découpage en 3 PRs séquentielles :

- **Sous-projet 1 — Engine + endpoints + migration** :
  `dataset_analysis.py`, endpoint `/analyze`, endpoints `m3/test-connection` +
  `m3/validate-url`, migration 0007, cache service, tests pytest.
- **Sous-projet 2 — Composants wizard partagés** :
  `WizardShell`, `WizardContext`, `HelpPanel`, `help-content.ts`, types,
  tests vitest des shared.
- **Sous-projet 3 — Les 3 wizards modules** :
  M1Wizard + 5 steps, M2Wizard + 5 steps, M3Wizard + 5 steps + TestConnectionStep,
  remplacement de `page.tsx`, tests vitest steps + E2E Playwright.

Chacun ship un comportement utilisable : SP1 = endpoints utilisables (testables avec curl),
SP2 = shell visible avec des steps stubs, SP3 = livraison complète.

## 9. Risques et mitigations

| Risque | Mitigation |
|---|---|
| Suggestions stats poussées rendent des résultats contre-intuitifs (ex : `code_postal` proposé comme attribut protégé car corrélé à la décision) | Seuil `confidence ≥ 0.3` strict, `reason` toujours en français lisible, suggestion en position #1 mais non « marquée » si confidence faible, l'utilisateur garde le contrôle total |
| Analyse stats lente sur gros CSV | Cache JSONB en DB, recalcul une seule fois ; skeleton + bouton « Continuer sans attendre » à 8 s |
| Drift entre `HelpKey` et `STEP_HELP` | Test vitest exhaustif (chaque clé du type a une entrée) |
| M3 test-connection consomme des appels payants | Un seul prompt anodin ; bouton « Sauter » toujours dispo ; pas d'auto-test |
| Régression UX pour utilisateurs habitués au formulaire à plat | Hors scope (les utilisateurs actuels ont déjà 20 audits passés et continueront de fonctionner — l'audit existant n'est pas touché) |

## 10. Principes produit respectés

1. **Détection ≠ verdict** : suggestion = aide à la saisie, pas une décision finale. L'utilisateur valide toujours.
2. **Pas de promesse réglementaire absolue** : aucun nouveau claim ajouté.
3. **Minimisation des données** : pas de stockage supplémentaire au-delà de `analysis_cache` (résumé statistique, pas les données).
4. **Pédagogie d'abord** : c'est le cœur de cet incrément.
5. **Souveraineté** : tout le calcul reste sur l'API Render Frankfurt + Supabase EU. Aucun appel externe ajouté.

## 11. Hors scope explicite

- Persistance de brouillon (save & resume cross-session)
- Clonage d'audit précédent (« Refaire le même audit qu'hier »)
- Mode expert (skip toutes les étapes, formulaire à plat)
- Refonte visuelle (Topbar, palette, branding)
- i18n (l'app est mono-langue FR ; les prompts M3 sont déjà fr/en mais le wizard reste FR)
- Onboarding/tour produit (out-of-scope explicite — c'est de l'orientation de saisie, pas de découverte produit)
