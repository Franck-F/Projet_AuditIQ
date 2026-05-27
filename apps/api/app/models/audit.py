from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, String, UniqueConstraint, Uuid, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class Audit(Base):
    __tablename__ = "audits"
    # `code` (AUD-YYYY-NNN) is generated per-org by `_next_code` in
    # audit_service. Uniqueness is scoped to the organization so two orgs
    # can both have an `AUD-2026-001` — see migration 0006.
    __table_args__ = (
        UniqueConstraint("org_id", "code", name="uq_audits_org_id_code"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    code: Mapped[str | None] = mapped_column(String(32), nullable=True)
    org_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )
    dataset_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("datasets.id"), nullable=True
    )
    module: Mapped[str] = mapped_column(String(8), nullable=False, default="M1")
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="pending")
    error: Mapped[str | None] = mapped_column(String(), nullable=True)
    protected_attribute: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    decision_column: Mapped[str | None] = mapped_column(String(255), nullable=True)
    favorable_value: Mapped[str | None] = mapped_column(String(255), nullable=True)
    privileged_value: Mapped[str | None] = mapped_column(String(255), nullable=True)
    config: Mapped[dict[str, object] | None] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), nullable=True
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
