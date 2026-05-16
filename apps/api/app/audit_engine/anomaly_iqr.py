"""Shared non-blocking pre-audit checks (M1 + M2). Pure, no I/O."""
from __future__ import annotations

import pandas as pd

from .types import IqrReport


def iqr_precheck(
    df: pd.DataFrame,
    *,
    numeric_columns: list[str] | None = None,
    group_column: str | None = None,
    min_group_ratio: float = 0.05,
    min_group_abs: int = 30,
    outlier_row_pct: float = 0.05,
) -> IqrReport:
    """Return non-blocking pre-audit warnings.

    - group_column set (M1): flag group-size imbalance.
    - group_column None (M2): flag heavy per-feature outliers (Tukey IQR).
    """
    warnings: list[str] = []

    if group_column is not None and group_column in df.columns:
        counts = df[group_column].astype(str).value_counts()
        if not counts.empty:
            largest = int(counts.max())
            for label, n in counts.items():
                n = int(n)
                if n < min_group_abs or (
                    largest > 0 and n / largest < min_group_ratio
                ):
                    warnings.append(
                        f"Déséquilibre : groupe « {label} » de faible "
                        f"effectif (n={n}) — résultats à interpréter avec "
                        f"prudence."
                    )

    return IqrReport(warnings=tuple(warnings))
