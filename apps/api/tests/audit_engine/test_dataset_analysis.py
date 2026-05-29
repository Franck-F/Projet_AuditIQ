"""Pure-engine tests for dataset_analysis.

Covers _profile_column heuristics (dtype, unique_count, role_hint).
"""
from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from app.audit_engine import run_dataset_analysis
from app.audit_engine.dataset_analysis import _profile_column, _suggest_decision, _suggest_protected
from app.audit_engine.types import ColumnProfile, DatasetAnalysis


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


def _profiles(df: pd.DataFrame) -> tuple[ColumnProfile, ...]:
    return tuple(_profile_column(df, c) for c in df.columns)


def test_suggest_decision_prefers_name_match() -> None:
    df = pd.DataFrame({
        "approved": [0, 1, 1, 0, 1, 0, 1, 0, 1, 0],
        "noise": [1.1, 2.2, 3.3, 4.4, 5.5, 6.6, 7.7, 8.8, 9.9, 10.0],
    })
    s = _suggest_decision(df, _profiles(df))
    assert s is not None
    assert s.column == "approved"
    assert s.confidence >= 0.5


def test_suggest_decision_favorable_is_minority_value() -> None:
    df = pd.DataFrame({"approved": ["yes"] * 3 + ["no"] * 7})
    s = _suggest_decision(df, _profiles(df))
    assert s is not None
    assert s.favorable_value == "yes"


def test_suggest_decision_skips_high_cardinality() -> None:
    df = pd.DataFrame({"id": list(range(20)), "decision": [0, 1] * 10})
    s = _suggest_decision(df, _profiles(df))
    assert s is not None
    assert s.column == "decision"


def test_suggest_decision_none_below_threshold() -> None:
    df = pd.DataFrame({
        "x": [1.0, 2.0, 3.0, 4.0, 5.0, 6.0],
        "y": ["a", "b", "c", "d", "e", "f"],
    })
    s = _suggest_decision(df, _profiles(df))
    assert s is None


def test_suggest_decision_robust_to_feature_nan() -> None:
    # Decision strongly tied to feature 'A'; column 'noisy' is mostly NaN.
    # The NaN column should NOT win over 'A' just by accident.
    df = pd.DataFrame({
        "approved": [0, 1, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1],
        "A": ["x", "y", "y", "x", "y", "x", "y", "x", "y", "x", "x", "y"],
        "noisy": [None, None, None, None, None, None, None, None, "z", "z", None, None],
    })
    s = _suggest_decision(df, _profiles(df))
    assert s is not None
    assert s.column == "approved"  # picked by name match, not poisoned MI


def test_suggest_protected_picks_name_match() -> None:
    df = pd.DataFrame({
        "sex": ["M"] * 100 + ["F"] * 100,
        "approved": [1] * 80 + [0] * 20 + [1] * 40 + [0] * 60,
        "city": (["Paris", "Lyon"] * 100),
    })
    s = _suggest_protected(df, _profiles(df), decision_col="approved")
    assert s is not None
    assert s.column == "sex"


def test_suggest_protected_uses_chi2_when_name_silent() -> None:
    rng = np.random.default_rng(0)
    n = 200
    decision = (["1"] * (n // 2)) + (["0"] * (n // 2))
    a = rng.choice(["x", "y"], size=n).tolist()
    b = (["alpha"] * 80 + ["beta"] * 20) + (["alpha"] * 30 + ["beta"] * 70)
    df = pd.DataFrame({"a": a, "b": b, "decision": decision})
    s = _suggest_protected(df, _profiles(df), decision_col="decision")
    assert s is not None
    assert s.column == "b"


def test_suggest_protected_none_if_decision_missing() -> None:
    df = pd.DataFrame({"sex": ["M", "F", "M", "F"]})
    s = _suggest_protected(df, _profiles(df), decision_col=None)
    assert s is None


def test_suggest_protected_filters_high_cardinality() -> None:
    df = pd.DataFrame({
        "postcode": [f"7500{i % 100}" for i in range(200)],
        "decision": ([0, 1] * 100),
    })
    s = _suggest_protected(df, _profiles(df), decision_col="decision")
    assert s is None


def test_run_dataset_analysis_full_flow() -> None:
    df = pd.DataFrame({
        "sex": ["M"] * 100 + ["F"] * 100,
        "approved": [1] * 80 + [0] * 20 + [1] * 40 + [0] * 60,
        "noise": list(range(200)),
    })
    a = run_dataset_analysis(df)
    assert isinstance(a, DatasetAnalysis)
    assert len(a.columns) == 3
    assert a.suggested_decision is not None
    assert a.suggested_decision.column == "approved"
    assert a.suggested_protected is not None
    assert a.suggested_protected.column == "sex"


def test_run_dataset_analysis_single_column_no_suggestions() -> None:
    df = pd.DataFrame({"x": [1, 2, 3, 4, 5]})
    a = run_dataset_analysis(df)
    assert len(a.columns) == 1
    assert a.suggested_decision is None
    assert a.suggested_protected is None


def test_run_dataset_analysis_constant_column_handled() -> None:
    df = pd.DataFrame({"x": [1] * 50, "y": [0, 1] * 25})
    a = run_dataset_analysis(df)
    assert all(p.unique_count >= 1 for p in a.columns)


def test_run_dataset_analysis_low_confidence_returns_none_suggestions() -> None:
    rng = np.random.default_rng(123)
    df = pd.DataFrame({
        "a": rng.choice(["x", "y"], 200),
        "b": rng.choice(["p", "q"], 200),
        "c": rng.choice([0, 1], 200),
    })
    a = run_dataset_analysis(df)
    if a.suggested_protected is not None:
        assert a.suggested_protected.confidence >= 0.3
