from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect


def test_0003_creates_reports_table_and_is_reversible(tmp_path, monkeypatch):
    db = tmp_path / "r.db"
    monkeypatch.setenv("SUPABASE_DB_URL", f"sqlite+aiosqlite:///{db}")
    cfg = Config("alembic.ini")

    command.upgrade(cfg, "head")
    insp = inspect(create_engine(f"sqlite:///{db}"))
    cols = {c["name"] for c in insp.get_columns("reports")}
    assert {"id", "audit_id", "format", "storage_path", "created_at"} <= cols

    command.downgrade(cfg, "0002")
    insp2 = inspect(create_engine(f"sqlite:///{db}"))
    assert "reports" not in insp2.get_table_names()
