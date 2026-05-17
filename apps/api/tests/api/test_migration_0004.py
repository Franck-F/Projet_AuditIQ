from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect


def test_0004_makes_m3_columns_nullable_and_reverses(tmp_path, monkeypatch):
    db = tmp_path / "m3.db"
    monkeypatch.setenv("SUPABASE_DB_URL", f"sqlite+aiosqlite:///{db}")
    cfg = Config("alembic.ini")

    command.upgrade(cfg, "head")
    cols = {
        c["name"]: c
        for c in inspect(create_engine(f"sqlite:///{db}")).get_columns("audits")
    }
    assert cols["dataset_id"]["nullable"] is True
    assert cols["decision_column"]["nullable"] is True
    assert cols["favorable_value"]["nullable"] is True

    command.downgrade(cfg, "0003")
    cols2 = {
        c["name"]: c
        for c in inspect(create_engine(f"sqlite:///{db}")).get_columns("audits")
    }
    assert cols2["decision_column"]["nullable"] is False
