"""add audits.archived_at (soft archive)

Revision ID: 0009
Revises: 0008
Create Date: 2026-06-15
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # NULL par défaut = audit actif. Non-NULL = date d'archivage (soft archive).
    with op.batch_alter_table("audits") as b:
        b.add_column(
            sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True)
        )


def downgrade() -> None:
    with op.batch_alter_table("audits") as b:
        b.drop_column("archived_at")
