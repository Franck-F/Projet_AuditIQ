"""audits.code uniqueness scoped per organization

Drop the global UNIQUE on `audits.code` (created implicitly by 0001 via
`unique=True` on the column, named by Postgres `audits_code_key`) and add
a composite UNIQUE on `(org_id, code)`. Without this, two organizations
whose audit counts coincide collide on the same `AUD-YYYY-NNN` code — the
first sign-up of org #2 would 500 on POST /audits with
`IntegrityError: duplicate key value violates unique constraint
"audits_code_key"`.

Existing rows are safe: within each org, `_next_code` already produced
distinct values, so the new composite constraint is satisfiable without
backfill.

SQLite caveat: the original `unique=True` was emitted as an unnamed
sqlite_autoindex which `drop_constraint` cannot target by Postgres's
`audits_code_key` name. We use dialect-conditional code so the migration
applies cleanly on both production Postgres and the SQLite-based test
fixtures. The composite UNIQUE is added on both dialects; on SQLite the
original inline UNIQUE is preserved (harmless: it's strictly stricter
than the new composite). The ORM model (`Audit.__table_args__`) drives
test fixtures via `Base.metadata.create_all`, not migrations, so test
behavior reflects the prod-Postgres post-migration state.

Revision ID: 0006
Revises: 0005
Create Date: 2026-05-27
"""
from __future__ import annotations

from alembic import op

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        # Postgres: drop the implicit per-column UNIQUE by its conventional
        # name. `IF EXISTS` keeps the migration idempotent if re-run.
        op.execute(
            'ALTER TABLE audits DROP CONSTRAINT IF EXISTS audits_code_key'
        )
    # Add the composite UNIQUE on both dialects. On SQLite this is wrapped
    # in batch_alter_table (copy-and-move strategy required for ALTER).
    with op.batch_alter_table("audits") as b:
        b.create_unique_constraint(
            "uq_audits_org_id_code", ["org_id", "code"]
        )


def downgrade() -> None:
    with op.batch_alter_table("audits") as b:
        b.drop_constraint("uq_audits_org_id_code", type_="unique")
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute(
            'ALTER TABLE audits ADD CONSTRAINT audits_code_key UNIQUE (code)'
        )
