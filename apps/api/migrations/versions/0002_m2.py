"""m2: nullable protected_attribute, audit config, pre_check

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-16
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

_JSON = sa.JSON().with_variant(JSONB, "postgresql")


def upgrade() -> None:
    with op.batch_alter_table("audits") as b:
        b.alter_column("protected_attribute", existing_type=sa.String(255),
                        nullable=True)
        b.add_column(sa.Column("config", _JSON, nullable=True))
    with op.batch_alter_table("audit_results") as b:
        b.add_column(sa.Column("pre_check", _JSON, nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("audit_results") as b:
        b.drop_column("pre_check")
    with op.batch_alter_table("audits") as b:
        b.drop_column("config")
        b.alter_column("protected_attribute", existing_type=sa.String(255),
                        nullable=False)
