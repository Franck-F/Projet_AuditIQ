from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect


def test_0005_adds_error_column_and_reverses(tmp_path, monkeypatch):
    db = tmp_path / "e.db"
    monkeypatch.setenv("SUPABASE_DB_URL", f"sqlite+aiosqlite:///{db}")
    cfg = Config("alembic.ini")

    command.upgrade(cfg, "head")
    cols = {c["name"] for c in
            inspect(create_engine(f"sqlite:///{db}")).get_columns("audits")}
    assert "error" in cols

    command.downgrade(cfg, "0004")
    cols2 = {c["name"] for c in
             inspect(create_engine(f"sqlite:///{db}")).get_columns("audits")}
    assert "error" not in cols2
