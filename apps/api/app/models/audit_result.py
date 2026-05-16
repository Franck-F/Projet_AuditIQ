from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Uuid, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class AuditResult(Base):
    __tablename__ = "audit_results"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    audit_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("audits.id"), nullable=False, index=True
    )
    metrics: Mapped[dict[str, object]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), nullable=False
    )
    verdict: Mapped[str] = mapped_column(String(16), nullable=False)
    risk_score: Mapped[int] = mapped_column(Integer, nullable=False)
    interpretation: Mapped[dict[str, object]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), nullable=False, default=dict
    )
    pre_check: Mapped[list[str] | None] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
