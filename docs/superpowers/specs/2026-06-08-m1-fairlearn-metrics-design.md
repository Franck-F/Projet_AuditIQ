# Spec — M1 métriques fairlearn additionnelles (ratios + taux par groupe) — sous-projet D

Date : 2026-06-08
Statut : design validé, prêt pour le plan
Périmètre : M1. **Additif et informatif** — aucune suppression, aucun changement de la logique de verdict.

## Contexte & objectif

L'utilisateur veut « plus de métriques », alignées sur le quickstart fairlearn (https://fairlearn.org/v0.13/quickstart.html). M1 calcule aujourd'hui, par groupe : `selection_rate`, `disparate_impact`, `tpr`, `fpr` ; en agrégat (marginal + paire, via C) : Disparate Impact, parité démographique (écart), Equal Opportunity (écart TPR), Equalized Odds (écart max TPR/FPR). Manquent les **ratios** fairlearn et des **taux par groupe** supplémentaires.

Décisions de cadrage validées :
- **Set complet** : ratios (DP/EO/EOdds) + taux par groupe (FNR, accuracy, precision ; recall = TPR existe déjà).
- **Informatif uniquement** : le verdict reste piloté par les métriques actuelles (DI + écarts) ; les nouvelles métriques sont affichées/reportées sans influencer pass/warn/fail.
- Taux par groupe **uniquement sur les groupes marginaux** (pas sur les cellules croisées — YAGNI) ; ratios au niveau marginal et par paire.

S'appuie sur la structure `marginals`/`pairwise` livrée en C (PR #60 mergée).

### Succès mesurable
1. Quand une colonne vérité-terrain est fournie, chaque groupe marginal expose `fnr`, `accuracy`, `precision` (en plus de tpr/fpr).
2. Chaque `MarginalResult` et chaque paire `IntersectionalResult` expose `demographic_parity_ratio`, `equal_opportunity_ratio` (si vérité-terrain), `equalized_odds_ratio` (si vérité-terrain).
3. Ces valeurs égalent les calculs fairlearn correspondants (test de cross-validation).
4. Affichées sur la page résultat et dans les rapports Excel/HTML ; le verdict/hero est inchangé.
5. Rétro-compat : sans vérité-terrain, les champs true-label restent `None` ; aucun audit existant ne casse.

### Hors périmètre
- Per-cell accuracy/precision/fnr sur les cellules croisées.
- Toute modification de la logique de verdict / risk_score.

## Définitions (alignées fairlearn)
- `demographic_parity_ratio` = min(selection_rate) / max(selection_rate) sur les groupes (1.0 si max=0). Distinct du `disparate_impact` privileged-relatif existant.
- `equal_opportunity_ratio` = min(TPR) / max(TPR) sur les groupes avec TPR défini (≥2 requis, sinon None).
- `equalized_odds_ratio` = min(ratio TPR, ratio FPR), chaque ratio = min/max du taux correspondant (fairlearn `equalized_odds_ratio`). None si <2 groupes pour l'un des taux.
- Par groupe (depuis la confusion {tp,fp,fn,tn}) : `fnr` = fn/(tp+fn) (None si tp+fn=0) ; `accuracy` = (tp+tn)/n ; `precision` = tp/(tp+fp) (None si tp+fp=0).

## Moteur — `audit_engine/metrics.py` + `types.py`

### types.py
- `GroupStat` : ajouter `fnr: float | None = None`, `accuracy: float | None = None`, `precision: float | None = None`.
- `MarginalResult` : ajouter `demographic_parity_ratio: float = 1.0`, `equal_opportunity_ratio: float | None = None`, `equalized_odds_ratio: float | None = None`.
- `IntersectionalResult` : ajouter les trois mêmes champs (mêmes défauts).

### metrics.py
- `demographic_parity_ratio(rates: dict[str, float]) -> float` : `min/max` (1.0 si max==0). Pur.
- Étendre `TrueLabelMetrics` (le dataclass retourné par `truelabel_metrics`) avec : `eo_ratio: float | None`, `eodds_ratio: float | None`, et les maps `accuracy: dict[str,float]`, `precision: dict[str,float]`, `fnr: dict[str,float]`. `truelabel_metrics` calcule ces valeurs depuis les confusions déjà fournies (mêmes garde-fous « ≥2 groupes » / groupes dégénérés que pour eo_diff/eodds_diff ; ratios None si non calculables).
  - `eo_ratio` = min/max des TPR définis (≥2) ; `eodds_ratio` = min(ratio_TPR, ratio_FPR) (chacun min/max ; None si <2).

### m1_supervised.py (`_marginal_audit`) et intersectional.py (`run_intersectional_pair`)
- `_marginal_audit` : après calcul des rates → `demographic_parity_ratio(rates)` ; via `truelabel_metrics`, peupler `equal_opportunity_ratio`/`equalized_odds_ratio` et, sur chaque `GroupStat`, `fnr`/`accuracy`/`precision` (depuis les maps, quand le groupe a une confusion). Renseigner les nouveaux champs du `MarginalResult`.
- `run_intersectional_pair` : calculer `demographic_parity_ratio` sur les taux des cellules croisées, et `equal_opportunity_ratio`/`equalized_odds_ratio` via la confusion par cellule déjà calculée ; renseigner les trois champs sur l'`IntersectionalResult` retourné (les deux chemins de retour). Les cellules gardent tpr/fpr (pas de nouveaux champs per-cell).

## DTO — `schemas/audit.py`
- `GroupStatOut` : +`fnr`, `accuracy`, `precision` (optionnels) + mapping.
- `MarginalOut` et `IntersectionalOut` : +`demographic_parity_ratio`, `equal_opportunity_ratio`, `equalized_odds_ratio` + mapping dans `_to_metrics_out`/adapters.

## Interprétation — `interpretation/m1.py` (+ prompt)
- `_metrics_json` : inclure les ratios (par marginal/paire) et, si présents, les taux par groupe. `_fallback` : une phrase informative listant les ratios du pire marginal/paire (sans changer le verdict). Prompt `m1_fr.md` : mentionner que ces ratios sont informatifs et que diff vs ratio se lisent ensemble.

## Rapports — `reporting/excel.py` + `html.py`
- Tableaux par groupe : colonnes additionnelles FNR/Accuracy/Precision (affichées seulement si vérité-terrain). Bloc métriques par marginal/paire : ajouter les trois ratios à côté des écarts existants.

## Web — page résultat + types
- `lib/api/audits.ts` : `GroupStatOut` (+fnr/accuracy/precision), `MarginalOut`/`IntersectionalOut` (+3 ratios).
- Page résultat (`app/app/audits/[id]/page.tsx` + composants M1) : ajouter les colonnes par groupe (si présentes) et afficher les ratios à côté des écarts dans les cartes marginales et les matrices de paires. Aucun changement du hero/verdict.

## Gestion d'erreurs / cas limites
- Sans vérité-terrain : tous les champs true-label (ratios EO/EOdds, fnr/accuracy/precision) restent `None` ; `demographic_parity_ratio` reste calculable (selection rate seul).
- Groupes dégénérés / <2 groupes définis : ratios None (mêmes règles que les écarts existants), jamais d'exception.
- `precision`/`fnr` None quand le dénominateur est 0.

## Tests (TDD)
### Moteur
- `demographic_parity_ratio` : min/max ; 1.0 si max==0.
- `truelabel_metrics` étendu : eo_ratio/eodds_ratio corrects ; accuracy/precision/fnr par groupe corrects (FNR == 1−TPR sur groupes non dégénérés).
- `_marginal_audit` peuple GroupStat.{fnr,accuracy,precision} + MarginalResult.{3 ratios} ; `run_intersectional_pair` peuple les ratios.
- **Cross-check fairlearn** (étendre `tests/audit_engine/test_truelabel_fairlearn.py`) : `demographic_parity_ratio` == fairlearn `demographic_parity_ratio` ; `equalized_odds_ratio` == fairlearn `equalized_odds_ratio` ; per-group accuracy/precision/fnr == `MetricFrame` by-group.
- Rétro-compat : sans GT, nouveaux true-label champs None ; verdict/risk inchangés (byte-équivalents à C).

### DTO / Web
- `M1MetricsOut` mappe les nouveaux champs (groupes + ratios).
- Web : la page résultat rend les colonnes/ratios quand présents et ne les rend pas (ou « — ») sans vérité-terrain.

## Découpage indicatif pour le plan
1. Types (GroupStat + MarginalResult + IntersectionalResult).
2. `metrics.py` : `demographic_parity_ratio` + extension `truelabel_metrics` (ratios + maps) + tests.
3. `_marginal_audit` + `run_intersectional_pair` peuplent les nouveaux champs + tests + cross-check fairlearn.
4. DTO (GroupStatOut/MarginalOut/IntersectionalOut) + adaptateurs + tests.
5. Interprétation (+ prompt).
6. Rapports Excel + HTML.
7. Web : types + page résultat (colonnes + ratios).

## Gates
API : `pytest` (`PYTHONUTF8=1` Windows), `ruff`, `mypy --strict`.
Web : `eslint .`, `tsc --noEmit`, `vitest`.
