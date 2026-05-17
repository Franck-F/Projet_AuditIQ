"""m3: dataset_id/decision_column/favorable_value nullable

Revision ID: 0004
Revises: 0003
Create Date: 2026-05-17
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("audits") as b:
        b.alter_column("dataset_id", existing_type=sa.Uuid(), nullable=True)
        b.alter_column("decision_column", existing_type=sa.String(255),
                        nullable=True)
        b.alter_column("favorable_value", existing_type=sa.String(255),
                        nullable=True)


def downgrade() -> None:
    with op.batch_alter_table("audits") as b:
        b.alter_column("favorable_value", existing_type=sa.String(255),
                        nullable=False)
        b.alter_column("decision_column", existing_type=sa.String(255),
                        nullable=False)
        b.alter_column("dataset_id", existing_type=sa.Uuid(), nullable=False)
