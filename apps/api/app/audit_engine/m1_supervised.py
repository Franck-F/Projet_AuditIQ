"""Pure M1 supervised fairness audit: run_m1(df, config) -> M1Result. No I/O."""
from __future__ import annotations

from itertools import combinations

import pandas as pd

from .errors import DatasetValidationError
from .intersectional import run_intersectional_pair
from .metrics import (
    VERDICT_ORDER,
    decide_verdict,
    demographic_parity_diff,
    demographic_parity_ratio,
    disparate_impacts,
    gap_verdict,
    group_confusion,
    pick_reference,
    risk_score,
    selection_rate,
    truelabel_metrics,
)
from .types import GroupStat, M1Config, M1Result, MarginalResult

_ROUND = 4


def _marginal_audit(
    df: pd.DataFrame,
    config: M1Config,
    attribute: str,
    *,
    is_primary: bool,
    error_field: str = "protected_attribute",
) -> MarginalResult:
    """Compute per-attribute M1 metrics, returning a MarginalResult.

    The privileged_value override is applied only when is_primary=True.
    Raises DatasetValidationError for invalid data/config.
    """
    pa = attribute
    dc = config.decision_column

    if pa not in df.columns:
        raise DatasetValidationError(
            f"Colonne attribut protégé « {pa} » absente du jeu de données.",
            field=error_field,
        )
    if dc not in df.columns:
        raise DatasetValidationError(
            f"Colonne de décision « {dc} » absente du jeu de données.",
            field="decision_column",
        )

    clean = df[[pa, dc]].dropna()
    if clean.empty:
        raise DatasetValidationError(
            "Aucune ligne exploitable après suppression des valeurs manquantes.",
            field=None,
        )

    pa_str = clean[pa].astype(str)
    dc_str = clean[dc].astype(str)

    decision_values = sorted(dc_str.unique())
    if len(decision_values) != 2:
        raise DatasetValidationError(
            f"La colonne de décision doit être binaire (2 valeurs), "
            f"trouvé {len(decision_values)} : {decision_values}.",
            field="decision_column",
        )
    fav = str(config.favorable_value)
    if fav not in decision_values:
        raise DatasetValidationError(
            f"Valeur favorable « {fav} » absente de la colonne de décision "
            f"(valeurs : {decision_values}).",
            field="favorable_value",
        )

    groups = sorted(pa_str.unique())
    if len(groups) < 2:
        raise DatasetValidationError(
            f"L'attribut protégé doit avoir au moins 2 groupes, trouvé "
            f"{len(groups)}.",
            field=error_field,
        )

    privileged = (
        str(config.privileged_value)
        if is_primary and config.privileged_value is not None
        else None
    )
    if privileged is not None and privileged not in groups:
        raise DatasetValidationError(
            f"Groupe privilégié « {privileged} » absent de l'attribut "
            f"protégé (groupes : {groups}).",
            field="privileged_value",
        )

    counts: dict[str, int] = {}
    favs: dict[str, int] = {}
    warnings: list[str] = []
    for g in groups:
        mask = pa_str == g
        n = int(mask.sum())
        if n < config.min_group_error:
            raise DatasetValidationError(
                f"Effectif insuffisant (n={n} < {config.min_group_error}) "
                f"pour le groupe « {g} » — audit non fiable.",
                field=error_field,
            )
        if n < config.min_group_warn:
            warnings.append(
                f"Effectif faible (n={n} < {config.min_group_warn}) pour le "
                f"groupe « {g} » — résultat peu concluant."
            )
        counts[g] = n
        favs[g] = int((mask & (dc_str == fav)).sum())

    rates = {g: selection_rate(favs[g], counts[g]) for g in groups}
    dp_ratio = demographic_parity_ratio(rates)
    reference = pick_reference(rates, privileged)
    if (
        privileged is not None
        and rates[reference] == 0.0
        and any(r > 0.0 for r in rates.values())
    ):
        raise DatasetValidationError(
            f"Le groupe privilégié « {reference} » a un taux de sélection "
            f"nul alors que d'autres groupes ont des décisions favorables — "
            f"Disparate Impact non calculable. Choisissez un autre groupe "
            f"de référence.",
            field="privileged_value",
        )
    di_map, di_warnings = disparate_impacts(rates, reference)
    warnings.extend(di_warnings)

    overall_di = min(di_map.values())
    worst_group = sorted(g for g, d in di_map.items() if d == overall_di)[0]
    dpd = demographic_parity_diff(rates)

    has_small = any(counts[g] < config.min_group_warn for g in groups)
    verdict = decide_verdict(
        overall_di, config.di_fail_below, config.di_warn_below, has_small
    )

    max_n = max(counts.values())
    min_n = min(counts.values())
    size_imbalance = 1.0 - (min_n / max_n) if max_n > 0 else 0.0
    score = risk_score(overall_di, size_imbalance)

    eo_diff = eodds_diff = None
    eo_ratio: float | None = None
    eodds_ratio: float | None = None
    dp_verdict = eo_verdict = eodds_verdict = tl_reason = None
    tpr_map: dict[str, float] = {}
    fpr_map: dict[str, float] = {}
    acc_map: dict[str, float] = {}
    prec_map: dict[str, float] = {}
    fnr_map: dict[str, float] = {}
    gt = config.ground_truth_column
    if gt is not None:
        if gt not in df.columns:
            raise DatasetValidationError(
                f"Colonne vérité-terrain « {gt} » absente du jeu de "
                f"données.",
                field="ground_truth_column",
            )
        tl = df[[pa, dc, gt]].dropna()
        confusion: dict[str, dict[str, int]] = {}
        if not tl.empty:
            tl_pa = tl[pa].astype(str)
            tl_pred = tl[dc].astype(str) == fav
            tl_true = tl[gt].astype(str) == fav
            for g in sorted(tl_pa.unique()):
                m = tl_pa == g
                confusion[g] = group_confusion(
                    list(tl_pred[m]), list(tl_true[m])
                )
        if len(confusion) >= 2:
            res = truelabel_metrics(confusion, privileged)
            warnings.extend(res.skipped)
            tpr_map, fpr_map = res.tpr, res.fpr
            acc_map, prec_map, fnr_map = res.accuracy, res.precision, res.fnr
            eo_diff = (
                round(res.eo_diff, _ROUND)
                if res.eo_diff is not None else None
            )
            eodds_diff = (
                round(res.eodds_diff, _ROUND)
                if res.eodds_diff is not None else None
            )
            eo_ratio = (
                round(res.eo_ratio, _ROUND)
                if res.eo_ratio is not None else None
            )
            eodds_ratio = (
                round(res.eodds_ratio, _ROUND)
                if res.eodds_ratio is not None else None
            )
            tl_reason = res.reason
            if eo_diff is not None:
                eo_verdict = gap_verdict(
                    eo_diff, config.di_fail_below, config.di_warn_below
                )
            if eodds_diff is not None:
                eodds_verdict = gap_verdict(
                    eodds_diff, config.di_fail_below, config.di_warn_below
                )
            dp_verdict = gap_verdict(
                round(dpd, _ROUND), config.di_fail_below,
                config.di_warn_below,
            )
        else:
            tl_reason = (
                "Equal Opportunity / Equalized Odds non calculable : "
                "moins de 2 groupes exploitables après prise en compte "
                "de la colonne vérité-terrain."
            )

    group_stats = [
        GroupStat(
            value=g,
            n=counts[g],
            favorable=favs[g],
            selection_rate=round(rates[g], _ROUND),
            disparate_impact=round(di_map[g], _ROUND),
            tpr=(round(tpr_map[g], _ROUND) if g in tpr_map else None),
            fpr=(round(fpr_map[g], _ROUND) if g in fpr_map else None),
            fnr=(round(fnr_map[g], _ROUND) if g in fnr_map else None),
            accuracy=(round(acc_map[g], _ROUND) if g in acc_map else None),
            precision=(round(prec_map[g], _ROUND) if g in prec_map else None),
        )
        for g in groups
    ]

    return MarginalResult(
        attribute=attribute,
        groups=tuple(group_stats),
        reference_value=reference,
        disparate_impact=round(overall_di, _ROUND),
        demographic_parity_diff=round(dpd, _ROUND),
        worst_group=worst_group,
        verdict=verdict,
        risk_score=score,
        warnings=tuple(warnings),
        equal_opportunity_diff=eo_diff,
        equalized_odds_diff=eodds_diff,
        demographic_parity_verdict=dp_verdict,
        equal_opportunity_verdict=eo_verdict,
        equalized_odds_verdict=eodds_verdict,
        truelabel_reason=tl_reason,
        demographic_parity_ratio=round(dp_ratio, _ROUND),
        equal_opportunity_ratio=eo_ratio,
        equalized_odds_ratio=eodds_ratio,
    )


def run_m1(df: pd.DataFrame, config: M1Config) -> M1Result:
    """Run the M1 supervised fairness audit for N protected attributes.

    Pure: no I/O, no LLM. Computes one MarginalResult per attribute and
    one IntersectionalResult per 2-way pair. The aggregate verdict is the
    worst of all marginals and pairs; top-level fields mirror the first
    marginal (backward-compat for 1-attribute calls).

    ``protected_attributes`` takes precedence over the legacy
    ``protected_attribute`` / ``secondary_protected_attribute`` pair.
    When ``protected_attributes`` is set, ``secondary_protected_attribute``
    must not be set simultaneously (raises DatasetValidationError).

    Value-comparison contract: the protected and decision columns are
    compared as strings via ``astype(str)``. ``favorable_value`` and
    ``privileged_value`` are matched using ``str(value)``. Callers must
    therefore pass these in a form that equals ``str()`` of the column's
    values (e.g. for a float column holding 1.0, pass "1.0", not 1).
    Normalising numeric/boolean columns is the responsibility of the
    caller / input layer, not this engine.

    Raises:
        DatasetValidationError: if the data or config cannot be audited.
    """
    # resolve attribute list (source of truth = protected_attributes,
    # else derive from primary + optional secondary — backward compat)
    if config.protected_attributes:
        # guard: secondary_protected_attribute must not be combined with the list
        if (
            config.secondary_protected_attribute is not None
            and config.secondary_protected_attribute
            not in config.protected_attributes
        ):
            raise DatasetValidationError(
                "Ne combinez pas 'secondary_protected_attribute' avec "
                "'protected_attributes' ; utilisez la liste.",
                field="protected_attributes",
            )
        attrs = list(config.protected_attributes)
    else:
        attrs = [config.protected_attribute]
        if config.secondary_protected_attribute:
            attrs.append(config.secondary_protected_attribute)

    # validate attribute list constraints
    if not 1 <= len(attrs) <= 4:
        raise DatasetValidationError(
            "Sélectionnez entre 1 et 4 attributs protégés.",
            field="protected_attributes",
        )
    if len(set(attrs)) != len(attrs):
        raise DatasetValidationError(
            "Les attributs protégés doivent être distincts.",
            field="protected_attributes",
        )
    for a in attrs:
        if a == config.decision_column or a == config.ground_truth_column:
            raise DatasetValidationError(
                f"L'attribut protégé « {a} » doit différer des colonnes "
                f"décision et vérité-terrain.",
                field="protected_attributes",
            )

    # validate secondary_protected_attribute presence (backward compat path)
    if config.secondary_protected_attribute is not None and not config.protected_attributes:
        sa = config.secondary_protected_attribute
        if sa not in df.columns:
            raise DatasetValidationError(
                f"Colonne attribut protégé secondaire « {sa} » absente "
                f"du jeu de données.",
                field="secondary_protected_attribute",
            )
        if sa == config.protected_attribute:
            raise DatasetValidationError(
                "L'attribut protégé secondaire doit différer du primaire.",
                field="secondary_protected_attribute",
            )

    marginals = [
        _marginal_audit(
            df, config, a, is_primary=(i == 0),
            error_field=(
                "protected_attributes" if config.protected_attributes
                else "protected_attribute"
            ),
        )
        for i, a in enumerate(attrs)
    ]
    pairwise = [
        run_intersectional_pair(df, config, a, b)
        for a, b in combinations(attrs, 2)
    ]

    verdicts = [m.verdict for m in marginals] + [p.verdict for p in pairwise]
    agg_verdict = max(verdicts, key=lambda v: VERDICT_ORDER[v])
    agg_risk = max(
        [m.risk_score for m in marginals] + [p.risk_score for p in pairwise]
    )

    first = marginals[0]
    return M1Result(
        groups=first.groups,
        reference_value=first.reference_value,
        disparate_impact=first.disparate_impact,
        demographic_parity_diff=first.demographic_parity_diff,
        worst_group=first.worst_group,
        verdict=agg_verdict,
        risk_score=agg_risk,
        warnings=first.warnings,
        equal_opportunity_diff=first.equal_opportunity_diff,
        equalized_odds_diff=first.equalized_odds_diff,
        demographic_parity_verdict=first.demographic_parity_verdict,
        equal_opportunity_verdict=first.equal_opportunity_verdict,
        equalized_odds_verdict=first.equalized_odds_verdict,
        truelabel_reason=first.truelabel_reason,
        marginals=tuple(marginals),
        pairwise=tuple(pairwise),
    )
