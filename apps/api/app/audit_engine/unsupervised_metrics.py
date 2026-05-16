"""Pure helpers for the M2 unsupervised engine. No I/O."""
from __future__ import annotations

import numpy as np
from scipy.stats import chi2_contingency

from .metrics import VERDICT_FAIL, VERDICT_PASS, VERDICT_WARN
from .types import FeatureContribution


def cluster_positive_rates(
    labels: np.ndarray, positive: np.ndarray, k: int
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
    labels: np.ndarray, positive: np.ndarray, k: int
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
