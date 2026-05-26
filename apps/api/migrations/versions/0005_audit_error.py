"""audit error message column

Revision ID: 0005
Revises: 0004
Create Date: 2026-05-22
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("audits") as b:
        b.add_column(sa.Column("error", sa.String(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("audits") as b:
        b.drop_column("error")
