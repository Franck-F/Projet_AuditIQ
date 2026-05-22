"""Pure M1 supervised fairness audit: run_m1(df, config) -> M1Result. No I/O."""
from __future__ import annotations

import pandas as pd

from .errors import DatasetValidationError
from .intersectional import run_intersectional
from .metrics import (
    decide_verdict,
    demographic_parity_diff,
    disparate_impacts,
    gap_verdict,
    group_confusion,
    pick_reference,
    risk_score,
    selection_rate,
    truelabel_metrics,
)
from .types import GroupStat, M1Config, M1Result

_ROUND = 4


def run_m1(df: pd.DataFrame, config: M1Config) -> M1Result:
    """Run the M1 supervised fairness audit.

    Pure: no I/O, no LLM. Validates the dataframe/config then computes
    Disparate Impact (4/5 rule), Demographic Parity, per-group selection
    rates, a verdict and a 0-100 risk score.

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
    pa = config.protected_attribute
    dc = config.decision_column

    if pa not in df.columns:
        raise DatasetValidationError(
            f"Colonne attribut protégé « {pa} » absente du jeu de données.",
            field="protected_attribute",
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
            field="protected_attribute",
        )

    privileged = (
        str(config.privileged_value) if config.privileged_value is not None else None
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
                field="protected_attribute",
            )
        if n < config.min_group_warn:
            warnings.append(
                f"Effectif faible (n={n} < {config.min_group_warn}) pour le "
                f"groupe « {g} » — résultat peu concluant."
            )
        counts[g] = n
        favs[g] = int((mask & (dc_str == fav)).sum())

    rates = {g: selection_rate(favs[g], counts[g]) for g in groups}
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
    dp_verdict = eo_verdict = eodds_verdict = tl_reason = None
    tpr_map: dict[str, float] = {}
    fpr_map: dict[str, float] = {}
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
            eo_diff = (
                round(res.eo_diff, _ROUND)
                if res.eo_diff is not None else None
            )
            eodds_diff = (
                round(res.eodds_diff, _ROUND)
                if res.eodds_diff is not None else None
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
        )
        for g in groups
    ]

    intersectional = None
    sa = config.secondary_protected_attribute
    if sa is not None:
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
        intersectional = run_intersectional(df, config)

    return M1Result(
        groups=tuple(group_stats),
        reference_value=reference,
        disparate_impact=round(overall_di, _ROUND),
        demographic_parity_diff=round(dpd, _ROUND),
        worst_group=worst_group,
        verdict=(intersectional.verdict if intersectional is not None
                 else verdict),
        risk_score=(intersectional.risk_score if intersectional is not None
                    else score),
        warnings=tuple(warnings),
        equal_opportunity_diff=eo_diff,
        equalized_odds_diff=eodds_diff,
        demographic_parity_verdict=dp_verdict,
        equal_opportunity_verdict=eo_verdict,
        equalized_odds_verdict=eodds_verdict,
        truelabel_reason=tl_reason,
        intersectional=intersectional,
    )
