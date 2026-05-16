from pathlib import Path

import pytest

from app.core.config import Settings, to_async_db_url


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("postgresql://u:p@h:5432/db", "postgresql+asyncpg://u:p@h:5432/db"),
        ("postgres://u:p@h:5432/db", "postgresql+asyncpg://u:p@h:5432/db"),
        ("postgresql+psycopg2://u:p@h/db", "postgresql+asyncpg://u:p@h/db"),
        ("postgresql+psycopg://u:p@h/db", "postgresql+asyncpg://u:p@h/db"),
        ("postgresql+asyncpg://u:p@h/db", "postgresql+asyncpg://u:p@h/db"),
        ("sqlite+aiosqlite:///./x.db", "sqlite+aiosqlite:///./x.db"),
    ],
)
def test_to_async_db_url(raw: str, expected: str) -> None:
    assert to_async_db_url(raw) == expected


def test_database_url_property_normalizes(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SUPABASE_DB_URL", "postgresql://u:p@h:5432/db")
    s = Settings(_env_file=None)
    assert s.database_url == "postgresql+asyncpg://u:p@h:5432/db"
    # Raw value preserved so the sqlite-guard validator still works.
    assert s.supabase_db_url == "postgresql://u:p@h:5432/db"


def test_env_file_is_absolute_and_cwd_independent() -> None:
    env_file = Settings.model_config["env_file"]
    candidates = env_file if isinstance(env_file, (list, tuple)) else [env_file]
    paths = [Path(p) for p in candidates]
    assert paths, "env_file must be configured"
    assert all(p.is_absolute() for p in paths), paths
    assert any(p.parts[-2:] == ("api", ".env") for p in paths), paths
