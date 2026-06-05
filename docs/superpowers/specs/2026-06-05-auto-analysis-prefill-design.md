# Spec — Analyse auto fiable (FR/EN) + préremplissage du wizard (sous-projet A+B)

Date : 2026-06-05
Statut : design validé, prêt pour le plan d'implémentation
Périmètre : M1 (tabular-known) en priorité ; la détection décision/favorable resservant à M2.

## Contexte & problème

À l'initialisation d'un audit, la phase 2 (« analyse automatique ») et la phase 3
(configuration) sont défaillantes :

- **L'analyse auto ne détecte rien sur des données FR.** `run_dataset_analysis`
  s'exécute bien (`POST /datasets/{id}/analyze`) mais renvoie
  `suggested_decision = None` et `suggested_protected = None` sur les 3 datasets M1
  de `Data_test/` (recrutement, crédit, true-label). Cause racine
  (`apps/api/app/audit_engine/dataset_analysis.py:24-32`) : la détection par nom est
  anglophone et ancrée (`^(decision|approved|outcome|class|target|label|...)$` ;
  `^(sex|gender|genre|age|...)$`). `embauche`/`accordé` ne matchent pas, et **`sexe`
  ≠ `sex`** (ancre). Le repli statistique (χ²/mutual-info) ne franchit pas le seuil
  0.3 sur de petits jeux → `None`. `embauche`/`sexe` finissent en `role=feature`.
- **La phase 3 ne préremplit rien.** Même lorsqu'une suggestion existe, `Step3Config`
  n'ajoute qu'un label « — Suggéré » ; aucun `setValue`. L'opérateur re-sélectionne
  tout à la main.
- Les options avancées (`privileged_value`, `ground_truth_column`) ne sont jamais
  suggérées.

Décisions de cadrage validées avec l'utilisateur :
- Découpage en sous-projets ; **A+B d'abord** (réparer+enrichir l'analyse, puis
  préremplir le wizard). C (multi-attributs) et D (métriques fairlearn) suivront,
  chacun son cycle spec→plan→build.
- **Préremplissage : tout pré-sélectionner, modifiable**, avec marqueur « suggéré »
  + confiance.
- **Valeur favorable : dictionnaire sémantique FR/EN + repli** classe minoritaire.
- A **classe tous** les attributs protégés candidats (pour resservir à C), mais B en
  **sélectionne un seul** pour l'instant.

## Objectifs (succès mesurable)

1. Sur les 3 datasets FR de `Data_test/`, l'analyse détecte correctement : colonne de
   décision, valeur favorable, attribut protégé (top), groupe de référence, et
   colonne vérité-terrain quand elle existe (`m1-truelabel-eo.csv`).
2. La phase 3 s'ouvre avec ces champs **pré-remplis et modifiables** ; les options
   avancées s'ouvrent automatiquement si une suggestion avancée existe.
3. Aucune régression : si l'analyse ne trouve rien (données réellement ambiguës), le
   wizard reste vide (comportement actuel). Le préremplissage n'écrase jamais une
   saisie utilisateur.

Hors objectifs (sous-projets suivants) : sélection de plusieurs attributs protégés
(C) ; nouvelles métriques fairlearn — ratios, FNR/accuracy… (D).

## Approche retenue

**Approche 1** — enrichir le moteur pur `run_dataset_analysis` (déjà testé) et garder
le wizard mince. Pas de nouvel endpoint ; pas de logique de détection dupliquée en TS.

## A — Moteur : `audit_engine/dataset_analysis.py` (pur, sans I/O)

### A.1 Détection bilingue, désaccentuée, insensible à la casse
- Helper `_normalize(name) -> str` : minuscule + suppression des accents
  (`unicodedata.normalize('NFKD', …)`) + découpage en tokens alphanumériques
  (`re.split(r"[^a-z0-9]+")`).
- Le match d'un nom se fait sur l'**ensemble de tokens** vs un vocabulaire, en
  comparaison **exacte par token** (évite `experience_ans` → `age`). Un nom matche
  s'il partage au moins un token avec le vocabulaire.
- Vocabulaire **décision** (FR/EN) : `decision, embauche, embauché, recrute, recruté,
  accorde, accordé, accord, accepte, accepté, admis, admission, retenu, octroi,
  octroye, refuse, refusé, approved, approuve, approuvé, outcome, class, target,
  label, result, status, hired, selected, granted, predicted, prediction, y`.
- Vocabulaire **protégé** : `sexe, sex, genre, gender, age, race, origine, origin,
  nationalite, nationality, ethnie, ethnic, ethnicity, religion, handicap,
  disability, orientation, situation, familiale, civilite`.
- Le repli statistique (χ² pour protégé, mutual-info pour décision) est conservé ;
  un match par **nom** garantit désormais que la colonne **remonte** dans les
  candidats même si le score statistique est faible (les colonnes au nom évocateur
  ne doivent plus être filtrées par le seuil 0.3 — voir A.3).

### A.2 Valeur favorable — dictionnaire sémantique + repli
- Vocabulaire **favorable** (formes normalisées) : `oui, accepte, accepté, admis,
  embauche, embauché, accorde, accordé, approuve, approuvé, retenu, octroye, favorable,
  positif, yes, approved, granted, hired, selected, accepted, eligible, true, 1`.
- Sur la colonne de décision suggérée : si une de ses valeurs (normalisée) matche le
  vocabulaire favorable → c'est la valeur favorable. Sinon repli sur la classe
  minoritaire (comportement actuel `counts.idxmin()`).
- Portée par `Suggestion.favorable_value` (champ existant).

### A.3 Classer TOUS les attributs protégés candidats
- `_suggest_protected` renvoie désormais une **liste triée** de `Suggestion`
  (au lieu du seul meilleur). Règle d'inclusion : une colonne est candidate si
  (nom évocateur) **ou** (score statistique ≥ seuil). Les colonnes au nom évocateur
  sont incluses indépendamment du seuil.
- `DatasetAnalysis.suggested_protected` reste = meilleur candidat (rétro-compat) ;
  nouveau `DatasetAnalysis.protected_candidates: tuple[Suggestion, ...]`.

### A.4 Groupe de référence suggéré (optionnel)
- Pour le **top** attribut protégé : calculer le taux favorable par groupe (en
  utilisant décision + favorable suggérées) et suggérer `privileged_value` = groupe
  au taux le plus élevé (= la référence que le moteur choisirait de toute façon ;
  rendue explicite et modifiable). Reste **optionnel**.
- Porté par un nouveau champ `Suggestion.privileged_value: object | None = None`.

### A.5 Colonne vérité-terrain suggérée
- Détecter une colonne candidate vérité-terrain : nom évocateur
  (`reel, réel, vrai, qualifie, qualifié, qualified, actually, ground, truth,
  true, label_reel, y_true`), binaire, et **partageant l'ensemble de valeurs** de la
  colonne de décision (afin que TPR/FPR soient calculables). Différente de la
  décision et de l'attribut protégé.
- Nouveau champ `DatasetAnalysis.suggested_ground_truth: Suggestion | None = None`.

### A.6 Types (`audit_engine/types.py`)
- `Suggestion` : ajout de `privileged_value: object | None = None`
  (déjà `favorable_value: object | None = None`).
- `DatasetAnalysis` : ajout de
  `protected_candidates: tuple[Suggestion, ...] = ()` et
  `suggested_ground_truth: Suggestion | None = None`.

## A' — DTO / schéma API

- `SuggestionOut` : ajout `privileged_value: ... | None = None`
  (déjà `favorable_value`).
- `DatasetAnalysisOut` : ajout
  `protected_candidates: list[SuggestionOut] = []` et
  `suggested_ground_truth: SuggestionOut | None = None`.
- Adaptateurs `from_engine` mis à jour pour mapper les nouveaux champs.
- Rétro-compatible (champs additifs avec défauts) — aucun client existant cassé.

## B — Wizard (`apps/web`)

Fichiers : `components/audits/wizard/unified/Step3Config.tsx`,
`Step2Source.tsx`, le conteneur `audits/nouveau/page.tsx`, les types
`wizard/.../types.ts`, et le client `lib/api/audits.ts`.

### B.1 Types client
- Étendre les miroirs TS `SuggestionOut` (+`privileged_value`) et
  `DatasetAnalysisOut` (+`protected_candidates`, `+suggested_ground_truth`).

### B.2 Préremplissage (Step3ConfigM1)
- Un `useEffect` (dépendance : `analysis`) applique via `setValue` **uniquement les
  champs encore vides** (garde anti-clobber : ne pas écraser une saisie utilisateur
  ni re-remplir après une modification) :
  - `decision_column` ← `suggested_decision.column`
  - `favorable_value` ← `suggested_decision.favorable_value`
  - `protected_attribute` ← `suggested_protected.column`
  - `privileged_value` ← `suggested_protected.privileged_value` (avancé)
  - `ground_truth_column` ← `suggested_ground_truth.column` (avancé)
- Badge « suggéré · conf. NN % » à côté de chaque champ prérempli ; override total.
- **Ouvrir automatiquement** la section « options avancées » si une suggestion
  avancée (`privileged_value` ou `ground_truth`) existe.

### B.3 Phase 2 (Step2Source) — résumé plus riche
- Afficher : décision détectée (+valeur favorable), attribut protégé (top), mention
  « + N autres attributs candidats » si `protected_candidates.length > 1`, et la
  colonne vérité-terrain si trouvée. Lecture seule — la sélection reste en phase 3.

## Gestion d'erreurs / cas limites

- Analyse sans suggestion → wizard vide, pas de régression (le correctif de détection
  rend ce cas rare sur données FR/EN étiquetées).
- Garde anti-clobber : le préremplissage ne s'applique qu'aux champs vides.
- Valeur favorable : si la décision n'a pas de libellé positif reconnu, repli classe
  minoritaire (jamais d'échec).
- Vérité-terrain : si aucune colonne ne partage l'ensemble de valeurs de la décision,
  pas de suggestion (EO/EOdds restent optionnels).

## Tests (TDD)

### Moteur (`tests/audit_engine/`)
- Détection sur les 3 datasets FR : décision (`embauche`/`accorde`/`predicted`),
  favorable (`oui`/`accepté`…), attribut protégé (`sexe`), groupe de référence,
  vérité-terrain (`actually_qualified` pour `m1-truelabel-eo.csv`). **RED net**
  aujourd'hui (tout `None`).
- Normalisation : accents/casse (`Sexe`, `ÂGE`), tokens (`experience_ans` ne matche
  pas `age`).
- Favorable sémantique : décision majoritairement « accepté » → favorable=`accepté`
  (et non la classe minoritaire).
- `protected_candidates` triés ; rétro-compat de `suggested_protected`.

### DTO (`tests/api/`)
- Adaptateur `from_engine` mappe `privileged_value`, `protected_candidates`,
  `suggested_ground_truth`.

### Web (`apps/web`, vitest)
- Le préremplissage applique les suggestions à l'arrivée de `analysis`.
- L'override est respecté : modifier un champ puis re-render ne le réécrase pas.

## Découpage en tâches (pour le plan)

1. Types moteur (`Suggestion`, `DatasetAnalysis`).
2. Détection bilingue normalisée (A.1) + tests.
3. Valeur favorable sémantique (A.2) + tests.
4. Candidats protégés classés (A.3) + tests.
5. Groupe de référence suggéré (A.4) + tests.
6. Colonne vérité-terrain suggérée (A.5) + tests.
7. DTO `SuggestionOut`/`DatasetAnalysisOut` + adaptateurs `from_engine` + tests.
8. Types client TS.
9. Préremplissage Step3 (anti-clobber, badges, ouverture avancées) + test vitest.
10. Résumé phase 2 enrichi (Step2Source).

## Gates

API : `pytest` (avec `PYTHONUTF8=1` sur Windows), `ruff`, `mypy --strict`.
Web : `vitest`, `tsc`, `eslint`.
