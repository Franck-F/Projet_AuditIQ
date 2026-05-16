"""Pure M2 unsupervised bias detection: run_m2(df, config) -> M2Result.

No I/O, no LLM. Deterministic via M2Config.random_state.
"""
from __future__ import annotations

import pandas as pd

from .errors import DatasetValidationError
from .types import M2Config, M2Result

_ROUND = 4


def _validate(
    df: pd.DataFrame, config: M2Config
) -> tuple[pd.DataFrame, list[str], list[str]]:
    """Validate and return (clean_df, feature_columns, warnings)."""
    dc = config.decision_column
    warnings: list[str] = []

    if dc not in df.columns:
        raise DatasetValidationError(
            f"Colonne de décision « {dc} » absente du jeu de données.",
            field="decision_column",
        )

    if config.feature_columns is not None:
        requested = list(config.feature_columns)
        missing = [c for c in requested if c not in df.columns]
        if missing:
            raise DatasetValidationError(
                f"Colonnes de features absentes : {missing}.",
                field="feature_columns",
            )
        candidate = requested
    else:
        candidate = [c for c in df.columns if c != dc]

    numeric: list[str] = []
    dropped: list[str] = []
    for c in candidate:
        if c == dc:
            continue
        if pd.api.types.is_numeric_dtype(df[c]):
            numeric.append(c)
        else:
            dropped.append(c)
    if dropped:
        warnings.append(
            f"Colonnes non numériques exclues du clustering : {dropped}."
        )
    if len(numeric) < 2:
        raise DatasetValidationError(
            f"Au moins 2 features numériques requises, trouvé {len(numeric)}.",
            field="feature_columns",
        )

    clean = df[[*numeric, dc]].dropna()
    n_dropped = len(df) - len(clean)
    if n_dropped > 0:
        warnings.append(
            f"{n_dropped} ligne(s) retirée(s) pour valeurs manquantes."
        )

    n = len(clean)
    min_rows = max(config.min_rows_factor * config.k, config.min_rows_abs)
    if n < min_rows:
        raise DatasetValidationError(
            f"Effectif insuffisant (n={n} < {min_rows}) pour k={config.k} "
            f"clusters — audit non fiable.",
            field=None,
        )
    if not (2 <= config.k < n):
        raise DatasetValidationError(
            f"k doit vérifier 2 ≤ k < n ; reçu k={config.k}, n={n}.",
            field=None,
        )

    dc_str = clean[dc].astype(str)
    decision_values = sorted(dc_str.unique())
    if len(decision_values) != 2:
        raise DatasetValidationError(
            f"La colonne de décision doit être binaire (2 valeurs), "
            f"trouvé {len(decision_values)} : {decision_values}.",
            field="decision_column",
        )
    if str(config.positive_value) not in decision_values:
        raise DatasetValidationError(
            f"Valeur positive « {config.positive_value} » absente de la "
            f"colonne de décision (valeurs : {decision_values}).",
            field="positive_value",
        )

    return clean, numeric, warnings


def run_m2(df: pd.DataFrame, config: M2Config) -> M2Result:
    """Run the M2 unsupervised bias-detection audit. Pure. Raises
    DatasetValidationError if the data/config cannot be audited."""
    _clean, _features, _warnings = _validate(df, config)
    raise NotImplementedError  # pipeline added in Task 8
