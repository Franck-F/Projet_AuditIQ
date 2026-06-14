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
                if n < min_group_abs:
                    warnings.append(
                        f"Effectif faible : groupe « {label} » "
                        f"(n={n} < {min_group_abs}) — résultats à "
                        f"interpréter avec prudence."
                    )
                elif largest > 0 and n / largest < min_group_ratio:
                    warnings.append(
                        f"Déséquilibre : groupe « {label} » très minoritaire "
                        f"(n={n} pour {largest} dans le groupe le plus "
                        f"nombreux) — résultats à interpréter avec prudence."
                    )

    cols = numeric_columns or []
    for col in cols:
        if col not in df.columns:
            continue
        s = pd.to_numeric(df[col], errors="coerce").dropna()
        if len(s) < 4:
            continue
        q1, q3 = s.quantile(0.25), s.quantile(0.75)
        iqr = q3 - q1
        if iqr == 0:
            n_out = int((s != q1).sum())
        else:
            lo, hi = q1 - 1.5 * iqr, q3 + 1.5 * iqr
            n_out = int(((s < lo) | (s > hi)).sum())
        if len(s) > 0 and n_out / len(s) >= outlier_row_pct:
            warnings.append(
                f"Feature « {col} » : {n_out} valeurs atypiques "
                f"({n_out / len(s):.0%}) — vérifiez la qualité des données."
            )

    return IqrReport(warnings=tuple(warnings))
