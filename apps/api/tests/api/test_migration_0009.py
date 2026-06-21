from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect


def test_0009_adds_audits_archived_at_and_reverses(tmp_path, monkeypatch):
    db = tmp_path / "e.db"
    monkeypatch.setenv("SUPABASE_DB_URL", f"sqlite+aiosqlite:///{db}")
    cfg = Config("alembic.ini")

    command.upgrade(cfg, "head")
    insp = inspect(create_engine(f"sqlite:///{db}"))

    audit_cols = {c["name"] for c in insp.get_columns("audits")}
    assert "archived_at" in audit_cols

    command.downgrade(cfg, "0008")
    insp2 = inspect(create_engine(f"sqlite:///{db}"))
    audit_cols2 = {c["name"] for c in insp2.get_columns("audits")}
    assert "archived_at" not in audit_cols2

    # Idempotency: re-upgrade cleanly re-adds the column.
    command.upgrade(cfg, "head")
    insp3 = inspect(create_engine(f"sqlite:///{db}"))
    assert "archived_at" in {c["name"] for c in insp3.get_columns("audits")}
