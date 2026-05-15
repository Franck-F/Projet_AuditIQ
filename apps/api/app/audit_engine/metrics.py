from __future__ import annotations

VERDICT_PASS = "pass"
VERDICT_WARN = "warn"
VERDICT_FAIL = "fail"


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
