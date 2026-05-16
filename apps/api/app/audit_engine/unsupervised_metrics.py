"""Pure helpers for the M2 unsupervised engine. No I/O."""
from __future__ import annotations

import numpy as np
import numpy.typing as npt
from scipy.stats import chi2_contingency

from .metrics import VERDICT_FAIL, VERDICT_PASS, VERDICT_WARN
from .types import FeatureContribution


def cluster_positive_rates(
    labels: npt.NDArray[np.generic], positive: npt.NDArray[np.generic], k: int
) -> tuple[dict[int, float], float, dict[int, int]]:
    """Return (positive_rate_per_cluster, global_positive_rate, size_per_cluster).

    Empty clusters get rate 0.0 and size 0.
    """
    rates: dict[int, float] = {}
    sizes: dict[int, int] = {}
    for c in range(k):
        mask = labels == c
        n = int(mask.sum())
        sizes[c] = n
        rates[c] = float(positive[mask].mean()) if n > 0 else 0.0
    global_rate = float(positive.mean()) if positive.size > 0 else 0.0
    return rates, global_rate, sizes


def chi2_cluster_decision(
    labels: npt.NDArray[np.generic], positive: npt.NDArray[np.generic], k: int
) -> tuple[float, float, int]:
    """Chi-squared independence test on the [cluster x decision] table.

    Empty cluster rows and constant-decision tables are degenerate: return
    a neutral (chi2=0.0, p=1.0, dof=0) result rather than raising.
    """
    pos_counts = np.array([int(positive[labels == c].sum()) for c in range(k)])
    neg_counts = np.array(
        [int((labels == c).sum()) - int(positive[labels == c].sum())
         for c in range(k)]
    )
    table = np.vstack([pos_counts, neg_counts])  # 2 x k
    # Drop all-zero columns (empty clusters) so chi2 has no zero margins.
    table = table[:, table.sum(axis=0) > 0]
    if table.shape[1] < 2 or (table.sum(axis=1) == 0).any():
        return 0.0, 1.0, 0
    chi2, p, dof, _ = chi2_contingency(table)
    return float(chi2), float(p), int(dof)


def deviations(
    rates: dict[int, float], global_rate: float, deviation_pp: float
) -> tuple[dict[int, float], tuple[int, ...]]:
    """Per-cluster deviation in percentage points and the deviant cluster ids.

    A cluster is deviant iff abs(deviation) strictly exceeds `deviation_pp`.
    """
    dev = {c: round((r - global_rate) * 100.0, 4) for c, r in rates.items()}
    deviant = tuple(sorted(c for c, d in dev.items() if abs(d) > deviation_pp))
    return dev, deviant


def characterize_cluster(
    cluster_mean: npt.NDArray[np.generic],
    global_mean: npt.NDArray[np.generic],
    global_std: npt.NDArray[np.generic],
    feature_names: list[str],
    top_n: int = 3,
) -> tuple[FeatureContribution, ...]:
    """Top-N features by |standardized difference| (cluster vs global).

    std_diff = (mean_cluster - mean_global) / std_global; a zero-variance
    feature contributes 0 and is effectively never selected.
    """
    contribs: list[FeatureContribution] = []
    for i, name in enumerate(feature_names):
        std = global_std[i]
        sd = 0.0 if std == 0.0 else float(
            (cluster_mean[i] - global_mean[i]) / std
        )
        if sd == 0.0:
            continue
        contribs.append(
            FeatureContribution(
                name=name,
                std_diff=round(sd, 4),
                direction="above" if sd > 0 else "below",
            )
        )
    contribs.sort(key=lambda f: abs(f.std_diff), reverse=True)
    return tuple(contribs[:top_n])


def m2_verdict(p_value: float, alpha: float, n_deviant: int) -> str:
    """fail = significant AND >=1 deviant; warn = exactly one; pass = none."""
    significant = p_value < alpha
    has_deviant = n_deviant > 0
    if significant and has_deviant:
        return VERDICT_FAIL
    if significant or has_deviant:
        return VERDICT_WARN
    return VERDICT_PASS


def m2_risk_score(
    p_value: float, alpha: float, max_abs_dev_pp: float, n_deviant: int, k: int
) -> int:
    """Deterministic 0-100. Weights: significance .50, magnitude .35, count .15.

    - sig = 1 - min(p/alpha, 1)            (0 when p>=alpha, ->1 as p->0)
    - mag = min(max_abs_dev_pp / 50, 1)    (50pp = max severity)
    - cnt = min(n_deviant / k, 1)
    """
    sig = 1.0 - min(p_value / alpha, 1.0) if alpha > 0 else 0.0
    mag = min(max_abs_dev_pp / 50.0, 1.0)
    cnt = min(n_deviant / k, 1.0) if k > 0 else 0.0
    score = 100.0 * (0.50 * sig + 0.35 * mag + 0.15 * cnt)
    return int(min(100, max(0, round(score))))
