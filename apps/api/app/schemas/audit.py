from __future__ import annotations

import datetime
import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict

Verdict = Literal["pass", "warn", "fail"]


class AuditCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    dataset_id: uuid.UUID
    title: str
    protected_attribute: str
    decision_column: str
    favorable_value: str
    privileged_value: str | None = None


class GroupStatOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    value: str
    n: int
    favorable: int
    selection_rate: float
    disparate_impact: float


class M1MetricsOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    groups: list[GroupStatOut]
    reference_value: str
    disparate_impact: float
    demographic_parity_diff: float
    worst_group: str
    verdict: Verdict
    risk_score: int
    warnings: list[str]


class AuditOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: uuid.UUID
    code: str | None
    title: str
    status: str
    module: str
    dataset_id: uuid.UUID
    protected_attribute: str
    decision_column: str
    favorable_value: str
    privileged_value: str | None
    created_at: datetime.datetime
    completed_at: datetime.datetime | None
    metrics: M1MetricsOut | None
