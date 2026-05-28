"""Dataset analysis engine — pure, no I/O.

Profiles columns and suggests decision/protected columns to drive the
wizard's auto-detection step (M1/M2).
"""
from __future__ import annotations

import re

import pandas as pd

from app.audit_engine.types import (
    ColumnProfile,
    DType,
    RoleHint,
)

_DECISION_RE = re.compile(
    r"^(decision|approved|outcome|class|target|label|result|status|y)$",
    re.IGNORECASE,
)
_PROTECTED_RE = re.compile(
    r"^(sex|gender|genre|age|race|origin|origine|nationality|nationalit[eé]"
    r"|ethni.*|religion|disability|handicap.*|orientation)$",
    re.IGNORECASE,
)


def _infer_dtype(series: pd.Series) -> DType:
    if pd.api.types.is_bool_dtype(series):
        return "boolean"
    if pd.api.types.is_datetime64_any_dtype(series):
        return "datetime"
    if pd.api.types.is_numeric_dtype(series):
        return "numeric"
    nunique = series.nunique(dropna=True)
    if nunique <= 50:
        return "categorical"
    return "text"


def _infer_role_hint(
    name: str, dtype: DType, unique_count: int, n_rows: int
) -> RoleHint:
    if _DECISION_RE.match(name) and 2 <= unique_count <= 10:
        return "decision"
    if _PROTECTED_RE.match(name) and 2 <= unique_count <= 20:
        return "protected"
    if dtype in {"numeric", "boolean"}:
        return "feature"
    if dtype == "categorical":
        if unique_count >= max(0.9 * n_rows, 50):
            return "identifier"
        return "feature"
    if unique_count >= max(0.9 * n_rows, 50):
        return "identifier"
    return "unknown"


def _profile_column(df: pd.DataFrame, name: str) -> ColumnProfile:
    series = df[name]
    dtype = _infer_dtype(series)
    unique_count = int(series.nunique(dropna=True))
    null_ratio = float(series.isna().mean())
    if unique_count <= 50:
        counts = series.value_counts(dropna=True).head(10)
        top_values: tuple[tuple[object, int], ...] = tuple(
            (k, int(v)) for k, v in counts.items()
        )
    else:
        top_values = ()
    role_hint = _infer_role_hint(name, dtype, unique_count, len(df))
    return ColumnProfile(
        name=name,
        dtype=dtype,
        unique_count=unique_count,
        null_ratio=null_ratio,
        top_values=top_values,
        role_hint=role_hint,
    )
