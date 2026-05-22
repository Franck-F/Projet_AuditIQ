"""Pure 2-way intersectional fairness analysis. No I/O. Never raises for
crossed-cell sparsity — degenerate cells are skipped with a warning."""
from __future__ import annotations

import pandas as pd

from .metrics import (
    decide_verdict,
    gap_verdict,
    group_confusion,
    risk_score,
    truelabel_metrics,
)
from .types import IntersectionalCell, IntersectionalResult, M1Config

_ROUND = 4


def _marginal_di(pa: pd.Series, fav_mask: pd.Series) -> float:
    """Min disparate impact of one attribute audited alone (max-rate ref)."""
    rates: dict[str, float] = {}
    for g in sorted(pa.unique()):
        m = pa == g
        n = int(m.sum())
        if n == 0:
            continue
        rates[g] = int((m & fav_mask).sum()) / n
    if not rates:
        return 1.0
    ref = max(rates.values())
    if ref == 0.0:
        return 1.0
    return round(min(r / ref for r in rates.values()), _ROUND)


def run_intersectional(
    df: pd.DataFrame, config: M1Config
) -> IntersectionalResult:
    """Cross config.protected_attribute x config.secondary_protected_attribute.

    Pure. Crossed cells with n < config.min_group_error are excluded with a
    warning; n < config.min_group_warn adds a low-confidence warning; fewer
    than 2 usable cells -> reason set, metrics None. Never raises here (the
    caller validates column presence).
    """
    pa = config.protected_attribute
    sa = config.secondary_protected_attribute
    dc = config.decision_column
    gt = config.ground_truth_column
    assert sa is not None  # caller guarantees

    cols = [pa, sa, dc] + ([gt] if gt is not None else [])
    clean = df[cols].dropna()
    p_str = clean[pa].astype(str)
    s_str = clean[sa].astype(str)
    fav = str(config.favorable_value)
    fav_mask = clean[dc].astype(str) == fav

    warnings: list[str] = []
    raw: dict[tuple[str, str], dict[str, int]] = {}
    for pv in sorted(p_str.unique()):
        for sv in sorted(s_str.unique()):
            mask = (p_str == pv) & (s_str == sv)
            n = int(mask.sum())
            if n == 0:
                continue
            if n < config.min_group_error:
                warnings.append(
                    f"Sous-groupe « {pv} × {sv} » : effectif insuffisant "
                    f"(n={n} < {config.min_group_error}) — exclu de "
                    f"l'analyse intersectionnelle."
                )
                continue
            if n < config.min_group_warn:
                warnings.append(
                    f"Sous-groupe « {pv} × {sv} » : effectif faible "
                    f"(n={n} < {config.min_group_warn}) — résultat peu "
                    f"concluant pour ce sous-groupe."
                )
            raw[(pv, sv)] = {"n": n, "fav": int((mask & fav_mask).sum())}

    marginal = (
        _marginal_di(p_str, fav_mask),
        _marginal_di(s_str, fav_mask),
    )

    if len(raw) < 2:
        return IntersectionalResult(
            cells=(), reference_primary="", reference_secondary="",
            worst_primary="", worst_secondary="", disparate_impact=1.0,
            demographic_parity_diff=0.0, verdict="warn", risk_score=0,
            marginal_di=marginal, warnings=tuple(warnings),
            reason=(
                "Analyse intersectionnelle non calculable : moins de 2 "
                "sous-groupes croisés exploitables après exclusion des "
                "cellules à effectif insuffisant."
            ),
        )

    rates = {k: v["fav"] / v["n"] for k, v in raw.items()}

    # reference cell
    ref_key: tuple[str, str] | None = None
    if (
        config.privileged_value is not None
        and config.secondary_privileged_value is not None
    ):
        cand = (str(config.privileged_value),
                str(config.secondary_privileged_value))
        if cand in rates:
            ref_key = cand
    if ref_key is None:
        max_rate = max(rates.values())
        ref_key = sorted(k for k, r in rates.items() if r == max_rate)[0]
    ref_rate = rates[ref_key]

    # optional per-cell true-label confusion
    tpr_map: dict[tuple[str, str], float] = {}
    fpr_map: dict[tuple[str, str], float] = {}
    eo_diff = eodds_diff = None
    dp_verdict = eo_verdict = eodds_verdict = None
    if gt is not None:
        true_mask = clean[gt].astype(str) == fav
        confusion: dict[str, dict[str, int]] = {}
        for (pv, sv) in raw:
            m = (p_str == pv) & (s_str == sv)
            confusion[f"{pv}|{sv}"] = group_confusion(
                list(fav_mask[m]), list(true_mask[m])
            )
        tl = truelabel_metrics(confusion, None)
        warnings.extend(tl.skipped)
        for ck, cv in tl.tpr.items():
            pv, sv = ck.split("|", 1)
            tpr_map[(pv, sv)] = cv
        for ck, cv in tl.fpr.items():
            pv, sv = ck.split("|", 1)
            fpr_map[(pv, sv)] = cv
        eo_diff = (
            round(tl.eo_diff, _ROUND) if tl.eo_diff is not None else None
        )
        eodds_diff = (
            round(tl.eodds_diff, _ROUND)
            if tl.eodds_diff is not None else None
        )

    cells: list[IntersectionalCell] = []
    di_by_key: dict[tuple[str, str], float] = {}
    for key in sorted(raw):
        di = 1.0 if ref_rate == 0.0 else rates[key] / ref_rate
        di_by_key[key] = round(di, _ROUND)
        has_small = raw[key]["n"] < config.min_group_warn
        cells.append(
            IntersectionalCell(
                primary_value=key[0], secondary_value=key[1],
                n=raw[key]["n"], favorable=raw[key]["fav"],
                selection_rate=round(rates[key], _ROUND),
                disparate_impact=round(di, _ROUND),
                verdict=decide_verdict(
                    di, config.di_fail_below, config.di_warn_below,
                    has_small,
                ),
                tpr=(round(tpr_map[key], _ROUND) if key in tpr_map
                     else None),
                fpr=(round(fpr_map[key], _ROUND) if key in fpr_map
                     else None),
            )
        )

    worst_di = min(di_by_key.values())
    worst_key = sorted(k for k, d in di_by_key.items()
                       if d == worst_di)[0]
    dpd = round(max(rates.values()) - min(rates.values()), _ROUND)
    has_small_any = any(v["n"] < config.min_group_warn
                        for v in raw.values())
    verdict = decide_verdict(worst_di, config.di_fail_below,
                             config.di_warn_below, has_small_any)
    score = risk_score(worst_di, 0.0)
    if eo_diff is not None:
        eo_verdict = gap_verdict(eo_diff, config.di_fail_below,
                                 config.di_warn_below)
    if eodds_diff is not None:
        eodds_verdict = gap_verdict(eodds_diff, config.di_fail_below,
                                    config.di_warn_below)
    dp_verdict = gap_verdict(dpd, config.di_fail_below,
                             config.di_warn_below)

    return IntersectionalResult(
        cells=tuple(cells),
        reference_primary=ref_key[0], reference_secondary=ref_key[1],
        worst_primary=worst_key[0], worst_secondary=worst_key[1],
        disparate_impact=round(worst_di, _ROUND),
        demographic_parity_diff=dpd,
        verdict=verdict, risk_score=score, marginal_di=marginal,
        equal_opportunity_diff=eo_diff, equalized_odds_diff=eodds_diff,
        demographic_parity_verdict=dp_verdict,
        equal_opportunity_verdict=eo_verdict,
        equalized_odds_verdict=eodds_verdict,
        warnings=tuple(warnings), reason=None,
    )
