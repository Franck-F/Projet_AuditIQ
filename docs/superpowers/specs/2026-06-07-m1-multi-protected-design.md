# Spec — M1 attributs protégés multiples : marginaux + croisements 2-à-2 (sous-projet C)

Date : 2026-06-07
Statut : design validé, prêt pour le plan
Périmètre : M1 (tabular-known). Généralise l'audit d'un attribut protégé (+ 1 secondaire intersectionnel) à **N attributs** (1–4).

## Contexte & objectif

Aujourd'hui le wizard ne permet qu'**un** attribut protégé + **un** secondaire intersectionnel (croisement 2-way unique). L'utilisateur veut auditer **plusieurs** attributs protégés. Sémantique validée : **chaque attribut audité séparément (marginal) + tous les croisements 2-à-2** (PAS de N-way complet). Décisions de cadrage validées :
- Modèle : `protected_attributes: list[str]` comme source de vérité, **rétro-compatible** (single + secondary repliés dans la liste).
- **Plafond : 4 attributs** (→ jusqu'à 6 paires).
- L'ancien champ unique `intersectional` est **remplacé** par une liste `pairwise` (migration interprétation/rapports/web incluse).
- `privileged_value` (optionnel) s'applique au 1ᵉʳ attribut ; les autres utilisent la **référence auto** (groupe au taux favorable le plus élevé). Per-attribut privileged = hors périmètre.

Dépend de A+B (mergé, PR #58) : l'analyse expose déjà `protected_candidates` (classés) qui amorcera le multi-select.

### Succès mesurable
1. Sélectionner 1–4 attributs protégés dans le wizard ; l'audit produit un marginal M1 par attribut + un croisement 2-way par paire.
2. Verdict/score global = le **pire** parmi tous les marginaux et toutes les paires.
3. **Rétro-compat** : un audit à 1 attribut donne une sortie équivalente à l'actuelle (mêmes chiffres top-level) ; les audits existants en base restent lisibles.
4. Page résultat + rapports Excel/HTML montrent les marginaux par attribut et la grille des paires.

### Hors périmètre
- D (métriques fairlearn supplémentaires : ratios DP/EOdds, FNR/accuracy/precision par groupe) — sous-projet suivant.
- Croisement N-way complet (>2 attributs croisés simultanément).
- Valeur privilégiée par attribut (au-delà du 1ᵉʳ).

## Modèle de données

### Moteur — `audit_engine/types.py`
- `M1Config` : ajouter `protected_attributes: tuple[str, ...] = ()`.
  - Résolution (dans `run_m1`) : si `protected_attributes` non vide → l'utiliser ; sinon construire `(protected_attribute,) + ((secondary_protected_attribute,) si présent)`. Conserver `protected_attribute`/`secondary_protected_attribute` pour la rétro-compat d'entrée.
  - Validation : 1–4 entrées, distinctes, chacune ≠ `decision_column` et ≠ `ground_truth_column`.
- Nouveau `MarginalResult` (frozen dataclass) — métriques M1 d'**un** attribut :
  `attribute: str`, `groups: tuple[GroupStat,...]`, `reference_value: str`, `disparate_impact: float`, `demographic_parity_diff: float`, `worst_group: str`, `verdict: str`, `risk_score: int`, `equal_opportunity_diff/equalized_odds_diff: float|None`, `demographic_parity_verdict/equal_opportunity_verdict/equalized_odds_verdict: str|None`, `truelabel_reason: str|None`, `warnings: tuple[str,...]`.
- `IntersectionalResult` : ajouter `primary_attribute: str = ""` et `secondary_attribute: str = ""` (noms des 2 attributs du croisement), pour pouvoir étiqueter chaque paire.
- `M1Result` : ajouter
  `marginals: tuple[MarginalResult, ...] = ()` (un par attribut, ordre = `protected_attributes`),
  `pairwise: tuple[IntersectionalResult, ...] = ()` (un par paire i<j).
  Les champs top-level (`groups`, `disparate_impact`, `verdict`, `risk_score`, …) deviennent **l'agrégat** (voir §Agrégation) ; le champ unique `intersectional` est **retiré** (remplacé par `pairwise`).

### API — `schemas/audit.py`
- `AuditCreate` : ajouter `protected_attributes: list[str] | None = None`.
  - Validation M1 (dans `_per_module`) : si fourni → 1–4 entrées, distinctes, ≠ decision/ground_truth ; sinon dériver de `protected_attribute` (+secondary, toujours acceptés). `protected_attribute` reste requis OU `protected_attributes` non vide (au moins un des deux).
- `M1MetricsOut` : ajouter `marginals: list[MarginalOut]` et `pairwise: list[IntersectionalOut]` ; retirer le champ singulier `intersectional`. `IntersectionalOut` gagne `primary_attribute`/`secondary_attribute`. Nouveau `MarginalOut` (miroir de `MarginalResult`). Adaptateurs `from_engine` mis à jour.

### Persistance — `models/audit.py` + service
- **Pas de migration DB.** `protected_attributes` est persisté dans la colonne JSON `config` existante (même mécanisme que `ground_truth_column`/`secondary_protected_attribute` aujourd'hui). Le service lit/écrit `config["protected_attributes"]`.
- Validation dataset au submit (colonnes présentes) étendue à toute la liste.

## Moteur — logique (`m1_supervised.py`, `intersectional.py`)

- Extraire la logique de calcul d'**un** attribut (déjà présente dans `run_m1` pour le primaire) en `_marginal_audit(df, config, attribute) -> MarginalResult` : DI (4/5, réf auto ou privileged si 1ᵉʳ), parité démo, taux/groupe, EO/EOdds si vérité-terrain, verdict, risque. Réutilise les helpers `metrics.py` existants.
- `run_m1` :
  1. valide df/config, résout la liste d'attributs (1–4, distincts).
  2. `marginals = [_marginal_audit(df, config, a) for a in attrs]`.
  3. `pairwise = [run_intersectional_pair(df, config, a, b) for a,b in combinations(attrs, 2)]` — généralisation de `run_intersectional` prenant explicitement les 2 attributs (au lieu de `protected_attribute`/`secondary_protected_attribute`), étiquetant le résultat avec leurs noms.
  4. agrège (voir §Agrégation), peuple les champs top-level depuis le **1ᵉʳ marginal** + l'agrégat, et `marginals`/`pairwise`.
- `intersectional.py` : `run_intersectional(df, config)` est généralisé/renommé en `run_intersectional_pair(df, config, attr_a, attr_b)` ; l'ancienne signature 2-way devient un cas d'usage (la couche `run_m1` ne passe plus par `secondary_protected_attribute`). `_marginal_di` inchangé.

### Agrégation (top-level M1Result)
- `verdict` = pire de `{m.verdict for m in marginals} ∪ {p.verdict for p in pairwise}` (ordre fail > warn > pass).
- `risk_score` = max de tous les `risk_score` (marginaux + paires).
- `groups`, `reference_value`, `disparate_impact`, `demographic_parity_diff`, `worst_group`, EO/EOdds top-level = ceux du **1ᵉʳ marginal** (rétro-compat : 1 attribut ⇒ top-level == aujourd'hui).
- Rétro-compat stricte : pour `protected_attributes` à 1 élément et aucun secondaire, `M1Result` top-level doit être **byte-équivalent** à l'actuel (marginals a 1 entrée, pairwise vide).

## Interprétation — `interpretation/m1.py`
- `_metrics_json` et le fallback déterministe migrés du champ `intersectional` unique vers `marginals` + `pairwise` : décrire le pire marginal, le pire croisé, et l'effet Gender Shades (marginal vs intersection) sur la **pire** paire. Le prompt `m1_fr.md` mis à jour pour la nouvelle structure (plusieurs attributs + paires).

## Web — `apps/web`
- **Step3Config (M1)** : l'attribut protégé devient un **multi-select (1–4)** alimenté par `dataset.columns` ; pré-sélection du top `protected_candidates` (de A) ; les autres candidats proposés en tête. Le select « attribut secondaire » est **supprimé** (fondu dans le multi-select). `privileged_value` (avancé) documenté comme s'appliquant au 1ᵉʳ attribut.
- **Types/state** (`unified/types.ts`) : `protected_attribute: string` → `protected_attributes: string[]` ; supprimer `secondary_protected_attribute`. `page.tsx` (submit) envoie `protected_attributes`.
- **Steps 4/5** (vérif/revue) : afficher la liste des N attributs.
- **Page résultat** : cartes **marginales par attribut** (réutiliser le rendu M1 actuel par attribut) + **grille de matrices 2-à-2** (réutiliser le rendu intersectionnel actuel, une matrice par paire, titrée `attr_a × attr_b`).
- **Client** (`lib/api/audits.ts`) : types `M1MetricsOut` (marginals/pairwise), `AuditCreate.protected_attributes`.
- **Rapports** Excel (`reporting/excel.py`) et HTML (`reporting/html.py`) : une section/feuille par attribut marginal + une par paire (généralisation des sections intersectionnelles actuelles).

## Gestion d'erreurs / cas limites
- 0 attribut → erreur de validation (au moins 1). >4 → erreur de validation.
- Paires à sous-effectif : comportement existant de `run_intersectional` conservé (cellules exclues + warning ; <2 cellules → paire non concluante, jamais d'exception).
- Attribut dupliqué dans la liste → rejeté.
- Audits existants en base (sans `protected_attributes` dans `config`) : lecture rétro-compatible via dérivation du `protected_attribute` column.

## Tests (TDD)
### Moteur
- `_marginal_audit(df, cfg, a)` == métriques d'un `run_m1` mono-attribut sur `a` (mêmes DI/DP/EO/EOdds/verdict).
- `run_m1` à 3 attributs : 3 marginaux + 3 paires ; agrégat verdict = pire ; risk = max.
- **Rétro-compat** : `run_m1` à 1 attribut → top-level identique à l'actuel + `marginals` à 1, `pairwise` vide.
- 2 attributs : `pairwise[0]` == ancien `run_intersectional` (même valeurs) + noms d'attributs renseignés.
- Validation : 0/5 attributs rejetés ; doublons rejetés ; attribut == decision/GT rejeté.
- (Option) cross-check fairlearn `MetricFrame` multi sensitive features sur les marginaux.

### API/DTO
- `AuditCreate` accepte `protected_attributes` ; dérivation depuis single/secondary ; validations.
- `M1MetricsOut.from_engine` mappe `marginals`/`pairwise` (+ noms).

### Web (vitest)
- Multi-select : sélection/désélection (max 4), pré-amorçage du top candidat.
- Page résultat : rend N cartes marginales + matrices par paire.

## Découpage indicatif pour le plan
1. Types moteur (`MarginalResult`, champs `M1Result`, noms sur `IntersectionalResult`).
2. `_marginal_audit` extrait + testé (rétro-compat mono-attribut).
3. `run_intersectional_pair` (généralisation 2-way explicite) + tests.
4. `run_m1` orchestration N attributs + agrégation + rétro-compat byte-équivalente.
5. DTO `MarginalOut`/`IntersectionalOut`/`M1MetricsOut` + adaptateurs.
6. Validation `AuditCreate.protected_attributes` + service (config JSON, dataset validation).
7. Interprétation `m1.py` (+ prompt) migrée marginals/pairwise.
8. Rapports Excel + HTML.
9. Web : types/state + Step3 multi-select + steps 4/5.
10. Web : page résultat (marginaux + matrices) + client.

## Gates
API : `pytest` (`PYTHONUTF8=1` sous Windows), `ruff`, `mypy --strict`.
Web : `eslint .`, `tsc --noEmit`, `vitest`.
