from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect

_MODELS = {"organizations", "users", "datasets", "audits", "audit_results"}


def test_upgrade_then_downgrade_on_sqlite(tmp_path, monkeypatch):
    db = tmp_path / "mig.db"
    monkeypatch.setenv("SUPABASE_DB_URL", f"sqlite+aiosqlite:///{db}")
    cfg = Config("alembic.ini")

    command.upgrade(cfg, "head")
    insp = inspect(create_engine(f"sqlite:///{db}"))
    assert set(insp.get_table_names()) >= _MODELS

    command.downgrade(cfg, "base")
    insp2 = inspect(create_engine(f"sqlite:///{db}"))
    remaining = _MODELS & set(insp2.get_table_names())
    assert remaining == set(), f"Tables not dropped: {remaining}"

    # Idempotency: migrations re-apply cleanly after a full downgrade.
    command.upgrade(cfg, "head")
    insp3 = inspect(create_engine(f"sqlite:///{db}"))
    assert set(insp3.get_table_names()) >= _MODELS
