"""reports table

Revision ID: 0003
Revises: 0002
Create Date: 2026-05-16
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "reports",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "audit_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("audits.id"),
            nullable=False,
        ),
        sa.Column("format", sa.String(8), nullable=False),
        sa.Column("storage_path", sa.String(1024), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_reports_audit_id", "reports", ["audit_id"])
    if op.get_bind().dialect.name == "postgresql":
        op.execute("ALTER TABLE reports ENABLE ROW LEVEL SECURITY")
        op.execute("ALTER TABLE reports FORCE ROW LEVEL SECURITY")
        op.execute(
            "DO $$ BEGIN "
            "CREATE POLICY no_direct_access ON reports FOR ALL "
            "TO anon, authenticated USING (false) WITH CHECK (false); "
            "EXCEPTION WHEN undefined_object THEN NULL; END $$"
        )


def downgrade() -> None:
    op.drop_table("reports")
