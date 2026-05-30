from __future__ import annotations

import datetime
import uuid
from typing import Any

import numpy as np
from pydantic import BaseModel, ConfigDict

from app.audit_engine.types import (
    ColumnProfile,
    DatasetAnalysis,
    Suggestion,
)


def _to_json_scalar(v: Any) -> Any:
    """Convert numpy scalars to native Python types for JSON serialisation."""
    if isinstance(v, np.integer):
        return int(v)
    if isinstance(v, np.floating):
        return float(v)
    if isinstance(v, np.bool_):
        return bool(v)
    return v


class DatasetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: uuid.UUID
    filename: str
    row_count: int
    columns: list[str]
    status: str
    created_at: datetime.datetime
    expires_at: datetime.datetime | None = None


class ColumnProfileOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    dtype: str
    unique_count: int
    null_ratio: float
    top_values: list[tuple[Any, int]]
    role_hint: str

    @classmethod
    def from_engine(cls, p: ColumnProfile) -> ColumnProfileOut:
        return cls(
            name=p.name,
            dtype=p.dtype,
            unique_count=int(p.unique_count),
            null_ratio=float(p.null_ratio),
            top_values=[(_to_json_scalar(k), int(v)) for k, v in p.top_values],
            role_hint=p.role_hint,
        )


class SuggestionOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    column: str
    confidence: float
    reason: str
    favorable_value: Any | None = None

    @classmethod
    def from_engine(cls, s: Suggestion) -> SuggestionOut:
        return cls(
            column=s.column,
            confidence=float(s.confidence),
            reason=s.reason,
            favorable_value=_to_json_scalar(s.favorable_value),
        )


class DatasetAnalysisOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    columns: list[ColumnProfileOut]
    suggested_decision: SuggestionOut | None = None
    suggested_protected: SuggestionOut | None = None

    @classmethod
    def from_engine(cls, a: DatasetAnalysis) -> DatasetAnalysisOut:
        return cls(
            columns=[ColumnProfileOut.from_engine(c) for c in a.columns],
            suggested_decision=(
                SuggestionOut.from_engine(a.suggested_decision)
                if a.suggested_decision
                else None
            ),
            suggested_protected=(
                SuggestionOut.from_engine(a.suggested_protected)
                if a.suggested_protected
                else None
            ),
        )
