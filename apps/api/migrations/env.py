import asyncio
import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine

import app.models  # noqa: F401  (registers tables on Base.metadata)
from app.core.config import get_settings, to_async_db_url
from app.core.db import Base

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def _url() -> str:
    return to_async_db_url(
        os.environ.get("SUPABASE_DB_URL") or get_settings().supabase_db_url
    )


def _do_run(connection: Connection) -> None:
    context.configure(
        connection=connection, target_metadata=target_metadata, compare_type=True
    )
    with context.begin_transaction():
        context.run_migrations()


async def _run_online() -> None:
    engine = create_async_engine(_url())
    async with engine.connect() as conn:
        await conn.run_sync(_do_run)
    await engine.dispose()


if context.is_offline_mode():
    context.configure(
        url=_url(), target_metadata=target_metadata, literal_binds=True
    )
    with context.begin_transaction():
        context.run_migrations()
else:
    # Alembic is CLI-only; asyncio.run() is safe here. Do not import this
    # module from async code.
    asyncio.run(_run_online())
