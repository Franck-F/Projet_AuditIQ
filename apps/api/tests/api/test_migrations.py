from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect


def test_upgrade_then_downgrade_on_sqlite(tmp_path, monkeypatch):
    db = tmp_path / "mig.db"
    monkeypatch.setenv("SUPABASE_DB_URL", f"sqlite+aiosqlite:///{db}")
    cfg = Config("alembic.ini")

    command.upgrade(cfg, "head")
    insp = inspect(create_engine(f"sqlite:///{db}"))
    assert {
        "organizations",
        "users",
        "datasets",
        "audits",
        "audit_results",
    } <= set(insp.get_table_names())

    command.downgrade(cfg, "base")
    insp2 = inspect(create_engine(f"sqlite:///{db}"))
    assert "organizations" not in insp2.get_table_names()
