"""dataset analysis cache column

Revision ID: 0007
Revises: 0006
Create Date: 2026-05-28
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("datasets") as b:
        b.add_column(
            sa.Column(
                "analysis_cache",
                sa.JSON().with_variant(JSONB, "postgresql"),
                nullable=True,
            )
        )


def downgrade() -> None:
    with op.batch_alter_table("datasets") as b:
        b.drop_column("analysis_cache")
