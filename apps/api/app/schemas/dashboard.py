from __future__ import annotations

import datetime
import uuid

from pydantic import BaseModel, ConfigDict

from app.schemas.audit import Verdict


class RecentAudit(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: uuid.UUID
    code: str | None
    title: str
    module: str
    verdict: Verdict | None
    risk_score: int | None
    created_at: datetime.datetime


class DashboardSummaryOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    total_audits: int
    failing_audits: int
    warning_audits: int
    risk_score: int
    module_usage: dict[str, int]
    recent_audits: list[RecentAudit]
