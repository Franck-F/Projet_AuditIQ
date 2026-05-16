"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-05-15
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

_JSON = sa.JSON().with_variant(JSONB, "postgresql")
_TABLES = ("organizations", "users", "datasets", "audits", "audit_results")


def upgrade() -> None:
    op.create_table(
        "organizations",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("settings", _JSON, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "org_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("organizations.id"),
            nullable=False,
        ),
        sa.Column("email", sa.String(320), nullable=False, unique=True),
        sa.Column("first_name", sa.String(120), nullable=True),
        sa.Column("role", sa.String(32), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_users_org_id", "users", ["org_id"])
    op.create_table(
        "datasets",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "org_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("organizations.id"),
            nullable=False,
        ),
        sa.Column(
            "uploaded_by",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("filename", sa.String(512), nullable=False),
        sa.Column("storage_path", sa.String(1024), nullable=False),
        sa.Column("row_count", sa.Integer(), nullable=False),
        sa.Column("columns", _JSON, nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_datasets_org_id", "datasets", ["org_id"])
    op.create_table(
        "audits",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("code", sa.String(32), nullable=True, unique=True),
        sa.Column(
            "org_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("organizations.id"),
            nullable=False,
        ),
        sa.Column(
            "dataset_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("datasets.id"),
            nullable=False,
        ),
        sa.Column("module", sa.String(8), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("protected_attribute", sa.String(255), nullable=False),
        sa.Column("decision_column", sa.String(255), nullable=False),
        sa.Column("favorable_value", sa.String(255), nullable=False),
        sa.Column("privileged_value", sa.String(255), nullable=True),
        sa.Column(
            "created_by",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_audits_org_id", "audits", ["org_id"])
    op.create_table(
        "audit_results",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "audit_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("audits.id"),
            nullable=False,
        ),
        sa.Column("metrics", _JSON, nullable=False),
        sa.Column("verdict", sa.String(16), nullable=False),
        sa.Column("risk_score", sa.Integer(), nullable=False),
        sa.Column("interpretation", _JSON, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_audit_results_audit_id", "audit_results", ["audit_id"])

    # RLS is PostgreSQL-only (Supabase). The API connects as the owner role
    # (RLS-exempt) and enforces org scoping in the service layer (spec §6 /
    # ADR 0002). These deny-all policies are defense-in-depth for any direct
    # anon/authenticated Supabase access.
    if op.get_bind().dialect.name == "postgresql":
        for table in _TABLES:
            op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
            op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
            op.execute(
                f"CREATE POLICY no_direct_access ON {table} FOR ALL "
                f"TO anon, authenticated USING (false) WITH CHECK (false)"
            )


def downgrade() -> None:
    for table in reversed(_TABLES):
        op.drop_table(table)
