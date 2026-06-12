from __future__ import annotations

from dataclasses import dataclass, field

VERDICT_PASS = "pass"
VERDICT_WARN = "warn"
VERDICT_FAIL = "fail"

VERDICT_ORDER: dict[str, int] = {"pass": 0, "warn": 1, "fail": 2}


def selection_rate(favorable: int, n: int) -> float:
    if n <= 0:
        raise ValueError("n must be > 0")
    return favorable / n


def pick_reference(rates: dict[str, float], privileged_value: str | None) -> str:
    if privileged_value is not None:
        return privileged_value
    max_rate = max(rates.values())
    return sorted(g for g, r in rates.items() if r == max_rate)[0]


def disparate_impacts(
    rates: dict[str, float], reference: str
) -> tuple[dict[str, float], list[str]]:
    ref_rate = rates[reference]
    if ref_rate == 0.0:
        return (
            dict.fromkeys(rates, 1.0),
            [
                f"Taux de sélection nul pour le groupe de référence "
                f"« {reference} » — Disparate Impact non calculable, "
                f"traité comme neutre (1.0)."
            ],
        )
    return ({g: r / ref_rate for g, r in rates.items()}, [])


def demographic_parity_diff(rates: dict[str, float]) -> float:
    return max(rates.values()) - min(rates.values())


def demographic_parity_ratio(rates: dict[str, float]) -> float:
    """min/max selection rate across groups (fairlearn). 1.0 if max == 0."""
    if not rates:
        return 1.0
    hi = max(rates.values())
    return 1.0 if hi == 0.0 else min(rates.values()) / hi


def _ratio(values: dict[str, float]) -> float | None:
    if len(values) < 2:
        return None
    hi = max(values.values())
    return None if hi == 0.0 else min(values.values()) / hi


def decide_verdict(
    di: float, fail_below: float, warn_below: float, has_small_group: bool
) -> str:
    if di < fail_below:
        return VERDICT_FAIL
    if di < warn_below:
        return VERDICT_WARN
    return VERDICT_WARN if has_small_group else VERDICT_PASS


def risk_score(di: float, size_imbalance: float) -> int:
    d = min(max(di, 0.0), 1.0)
    if d >= 0.90:
        base = (1.0 - d) / 0.10 * 20.0
    elif d >= 0.80:
        base = 20.0 + (0.90 - d) / 0.10 * 30.0
    else:
        base = 50.0 + (0.80 - d) / 0.80 * 50.0
    return int(min(100, max(0, round(base + size_imbalance * 10.0))))


def gap_verdict(d: float, di_fail_below: float, di_warn_below: float) -> str:
    """Verdict for a parity GAP in [0,1], reusing the DI thresholds'
    complements (no new magic numbers). gap > (1-di_fail_below) -> fail ;
    gap > (1-di_warn_below) -> warn ; else pass."""
    fail_threshold = round(1.0 - di_fail_below, 10)
    warn_threshold = round(1.0 - di_warn_below, 10)
    if d > fail_threshold:
        return VERDICT_FAIL
    if d > warn_threshold:
        return VERDICT_WARN
    return VERDICT_PASS


def group_confusion(
    y_pred: list[bool], y_true: list[bool]
) -> dict[str, int]:
    tp = fp = fn = tn = 0
    for p, t in zip(y_pred, y_true, strict=True):
        if p and t:
            tp += 1
        elif p and not t:
            fp += 1
        elif (not p) and t:
            fn += 1
        else:
            tn += 1
    return {"tp": tp, "fp": fp, "fn": fn, "tn": tn}


@dataclass(frozen=True)
class TrueLabelMetrics:
    tpr: dict[str, float]
    fpr: dict[str, float]
    eo_diff: float | None
    eodds_diff: float | None
    skipped: list[str]
    reason: str | None
    eo_ratio: float | None = None
    eodds_ratio: float | None = None
    accuracy: dict[str, float] = field(default_factory=dict)
    precision: dict[str, float] = field(default_factory=dict)
    fnr: dict[str, float] = field(default_factory=dict)


def _gap(values: dict[str, float], privileged: str | None) -> float:
    if privileged is not None and privileged in values:
        ref = values[privileged]
        return max(abs(v - ref) for v in values.values())
    return max(values.values()) - min(values.values())


def truelabel_metrics(
    confusion: dict[str, dict[str, int]], privileged: str | None
) -> TrueLabelMetrics:
    """EO = TPR gap ; Equalized Odds = max(TPR gap, FPR gap). Degenerate
    groups (no real positives / no real negatives) are skipped per rate
    with a warning; <2 comparable groups for a rate -> that metric is
    None with a reason. Never raises."""
    tpr: dict[str, float] = {}
    fpr: dict[str, float] = {}
    skipped: list[str] = []
    accuracy: dict[str, float] = {}
    precision: dict[str, float] = {}
    fnr: dict[str, float] = {}
    for g, c in confusion.items():
        pos = c["tp"] + c["fn"]
        neg = c["fp"] + c["tn"]
        if pos == 0:
            skipped.append(
                f"Groupe « {g} » : aucun positif réel — TPR (Equal "
                f"Opportunity) non calculable pour ce groupe, ignoré."
            )
        else:
            tpr[g] = c["tp"] / pos
            fnr[g] = c["fn"] / pos
        if neg == 0:
            skipped.append(
                f"Groupe « {g} » : aucun négatif réel — FPR non "
                f"calculable pour ce groupe, ignoré."
            )
        else:
            fpr[g] = c["fp"] / neg
        n = c["tp"] + c["fp"] + c["fn"] + c["tn"]
        if n > 0:
            accuracy[g] = (c["tp"] + c["tn"]) / n
        if (c["tp"] + c["fp"]) > 0:
            precision[g] = c["tp"] / (c["tp"] + c["fp"])
    reason: str | None = None
    eo_diff: float | None = None
    eodds_diff: float | None = None
    if len(tpr) >= 2:
        eo_diff = _gap(tpr, privileged)
    else:
        reason = (
            "Equal Opportunity / Equalized Odds non calculable : moins de "
            "2 groupes avec un taux de vrais positifs défini."
        )
    if eo_diff is not None and len(fpr) >= 2:
        eodds_diff = max(eo_diff, _gap(fpr, privileged))
    elif eo_diff is not None:
        eodds_diff = None
        reason = (
            "Equalized Odds non calculable : moins de 2 groupes avec un "
            "taux de faux positifs défini."
        )
    eo_ratio = _ratio(tpr)
    eodds_ratio: float | None = None
    if eo_ratio is not None and len(fpr) >= 2:
        fpr_ratio = _ratio(fpr)
        eodds_ratio = min(eo_ratio, fpr_ratio) if fpr_ratio is not None else None
    return TrueLabelMetrics(
        tpr=tpr, fpr=fpr, eo_diff=eo_diff, eodds_diff=eodds_diff,
        skipped=skipped, reason=reason,
        eo_ratio=eo_ratio, eodds_ratio=eodds_ratio,
        accuracy=accuracy, precision=precision, fnr=fnr,
    )
