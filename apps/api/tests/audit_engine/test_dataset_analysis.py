"""Pure-engine tests for dataset_analysis.

Covers _profile_column heuristics (dtype, unique_count, role_hint).
"""
from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from app.audit_engine.dataset_analysis import _profile_column


def test_profile_numeric_column() -> None:
    df = pd.DataFrame({"age": [25, 30, 35, 40, 25]})
    p = _profile_column(df, "age")
    assert p.name == "age"
    assert p.dtype == "numeric"
    assert p.unique_count == 4
    assert p.null_ratio == 0.0


def test_profile_categorical_column_with_top_values() -> None:
    df = pd.DataFrame({"genre": ["F", "M", "F", "F", "M"]})
    p = _profile_column(df, "genre")
    assert p.dtype == "categorical"
    assert p.unique_count == 2
    assert dict(p.top_values) == {"F": 3, "M": 2}


def test_profile_high_cardinality_no_top_values() -> None:
    df = pd.DataFrame({"id": list(range(60))})
    p = _profile_column(df, "id")
    assert p.unique_count == 60
    assert p.top_values == ()


def test_profile_null_ratio() -> None:
    df = pd.DataFrame({"x": [1, None, 2, None, 3]})
    p = _profile_column(df, "x")
    assert p.null_ratio == pytest.approx(0.4)


def test_role_hint_decision_by_name() -> None:
    df = pd.DataFrame({"approved": [0, 1, 1, 0]})
    p = _profile_column(df, "approved")
    assert p.role_hint == "decision"


def test_role_hint_protected_by_name() -> None:
    df = pd.DataFrame({"sex": ["F", "M", "F", "M", "F", "M"]})
    p = _profile_column(df, "sex")
    assert p.role_hint == "protected"


def test_role_hint_identifier_high_cardinality() -> None:
    df = pd.DataFrame({"customer_id": [f"C{i}" for i in range(100)]})
    p = _profile_column(df, "customer_id")
    assert p.role_hint == "identifier"


def test_role_hint_feature_for_low_card_numeric() -> None:
    df = pd.DataFrame({"feature_x": np.linspace(0, 1, 30)})
    p = _profile_column(df, "feature_x")
    # numeric, unique_count=30, n_rows=30: identifier threshold = max(0.9*30, 50) = 50,
    # so 30 < 50 → not identifier; dtype=numeric → "feature"
    assert p.role_hint == "feature"


def test_role_hint_unknown_for_text_column() -> None:
    # 100 rows, text dtype (60 unique → > 50 so dtype="text"), but not identifier
    # (60 < max(0.9*100, 50) = 90). Falls through to "unknown".
    values = [f"value_{i % 60}" for i in range(100)]
    df = pd.DataFrame({"some_text_col": values})
    p = _profile_column(df, "some_text_col")
    assert p.dtype == "text"
    assert p.role_hint == "unknown"
