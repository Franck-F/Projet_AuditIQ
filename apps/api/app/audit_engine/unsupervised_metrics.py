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
