from __future__ import annotations

import pandas as pd

from .errors import DatasetValidationError
from .metrics import (
    decide_verdict,
    demographic_parity_diff,
    disparate_impacts,
    pick_reference,
    risk_score,
    selection_rate,
)
from .types import GroupStat, M1Config, M1Result

_ROUND = 4


def run_m1(df: pd.DataFrame, config: M1Config) -> M1Result:
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
            field="decision_column",
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

    group_stats = [
        GroupStat(
            value=g,
            n=counts[g],
            favorable=favs[g],
            selection_rate=round(rates[g], _ROUND),
            disparate_impact=round(di_map[g], _ROUND),
        )
        for g in groups
    ]

    return M1Result(
        groups=group_stats,
        reference_value=reference,
        disparate_impact=round(overall_di, _ROUND),
        demographic_parity_diff=round(dpd, _ROUND),
        worst_group=worst_group,
        verdict=verdict,
        risk_score=score,
        warnings=warnings,
    )
