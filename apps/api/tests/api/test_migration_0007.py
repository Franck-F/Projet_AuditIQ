from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect


def test_0007_adds_analysis_cache_column_and_reverses(tmp_path, monkeypatch):
    db = tmp_path / "e.db"
    monkeypatch.setenv("SUPABASE_DB_URL", f"sqlite+aiosqlite:///{db}")
    cfg = Config("alembic.ini")

    command.upgrade(cfg, "head")
    cols = {c["name"] for c in
            inspect(create_engine(f"sqlite:///{db}")).get_columns("datasets")}
    assert "analysis_cache" in cols

    sync_inspector = inspect(create_engine(f"sqlite:///{db}"))
    col = next(c for c in sync_inspector.get_columns("datasets")
               if c["name"] == "analysis_cache")
    assert col["nullable"] is True

    command.downgrade(cfg, "0006")
    cols2 = {c["name"] for c in
             inspect(create_engine(f"sqlite:///{db}")).get_columns("datasets")}
    assert "analysis_cache" not in cols2
