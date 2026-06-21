"""organization extra fields + invitations table

Revision ID: 0008
Revises: 0007
Create Date: 2026-06-14
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("organizations") as b:
        b.add_column(sa.Column("siren", sa.String(32), nullable=True))
        b.add_column(sa.Column("sector", sa.String(120), nullable=True))
        b.add_column(sa.Column("country", sa.String(120), nullable=True))
        b.add_column(sa.Column("company_size", sa.String(64), nullable=True))
        b.add_column(sa.Column("dpo_name", sa.String(255), nullable=True))

    op.create_table(
        "invitations",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "org_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("organizations.id"),
            nullable=False,
        ),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("role", sa.String(32), nullable=False),
        sa.Column("token", sa.String(64), nullable=False, unique=True),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column(
            "invited_by",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_invitations_org_id", "invitations", ["org_id"])
    op.create_index("ix_invitations_email_status", "invitations", ["email", "status"])
    op.create_index("ix_invitations_token", "invitations", ["token"])

    # RLS is PostgreSQL-only (Supabase). The API connects as an RLS-exempt
    # role and enforces org scoping in the service layer; this deny-all
    # policy is defense-in-depth for direct anon/authenticated access.
    if op.get_bind().dialect.name == "postgresql":
        op.execute("ALTER TABLE invitations ENABLE ROW LEVEL SECURITY")
        op.execute("ALTER TABLE invitations FORCE ROW LEVEL SECURITY")
        op.execute(
            "DO $$ BEGIN "
            "CREATE POLICY no_direct_access ON invitations FOR ALL "
            "TO anon, authenticated USING (false) WITH CHECK (false); "
            "EXCEPTION WHEN undefined_object THEN NULL; END $$"
        )


def downgrade() -> None:
    op.drop_index("ix_invitations_token", table_name="invitations")
    op.drop_index("ix_invitations_email_status", table_name="invitations")
    op.drop_index("ix_invitations_org_id", table_name="invitations")
    op.drop_table("invitations")
    with op.batch_alter_table("organizations") as b:
        b.drop_column("dpo_name")
        b.drop_column("company_size")
        b.drop_column("country")
        b.drop_column("sector")
        b.drop_column("siren")
