"""Tests for DatasetAnalysisOut Pydantic schemas (from_engine adapters)."""
from __future__ import annotations

import pandas as pd

from app.audit_engine import run_dataset_analysis
from app.schemas.dataset import DatasetAnalysisOut


def test_dataset_analysis_out_serializes_full_flow() -> None:
    df = pd.DataFrame({
        "sex": ["M"] * 100 + ["F"] * 100,
        "approved": [1] * 80 + [0] * 20 + [1] * 40 + [0] * 60,
    })
    analysis = run_dataset_analysis(df)
    payload = DatasetAnalysisOut.from_engine(analysis)
    data = payload.model_dump()
    assert "columns" in data
    assert "suggested_decision" in data
    assert data["suggested_protected"]["column"] == "sex"


def test_dataset_analysis_out_handles_none_suggestions() -> None:
    df = pd.DataFrame({"x": [1, 2, 3]})
    payload = DatasetAnalysisOut.from_engine(run_dataset_analysis(df))
    data = payload.model_dump()
    assert data["suggested_decision"] is None
    assert data["suggested_protected"] is None
