from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect


def test_0002_adds_m2_columns_and_is_reversible(tmp_path, monkeypatch):
    db = tmp_path / "m2.db"
    monkeypatch.setenv("SUPABASE_DB_URL", f"sqlite+aiosqlite:///{db}")
    cfg = Config("alembic.ini")

    command.upgrade(cfg, "head")
    insp = inspect(create_engine(f"sqlite:///{db}"))
    audit_cols = {c["name"]: c for c in insp.get_columns("audits")}
    ar_cols = {c["name"] for c in insp.get_columns("audit_results")}
    assert "config" in audit_cols
    assert audit_cols["protected_attribute"]["nullable"] is True
    assert "pre_check" in ar_cols

    command.downgrade(cfg, "0001")
    insp2 = inspect(create_engine(f"sqlite:///{db}"))
    audit_cols2 = {c["name"] for c in insp2.get_columns("audits")}
    ar_cols2 = {c["name"] for c in insp2.get_columns("audit_results")}
    assert "config" not in audit_cols2
    assert "pre_check" not in ar_cols2
