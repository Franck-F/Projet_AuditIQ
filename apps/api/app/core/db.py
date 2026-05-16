from __future__ import annotations

from collections.abc import AsyncIterator
from functools import lru_cache

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


def make_engine(url: str) -> AsyncEngine:
    return create_async_engine(url, future=True, pool_pre_ping=True)


@lru_cache
def _sessionmaker() -> async_sessionmaker[AsyncSession]:
    engine = make_engine(get_settings().database_url)
    return async_sessionmaker(engine, expire_on_commit=False)


async def get_session() -> AsyncIterator[AsyncSession]:
    async with _sessionmaker()() as session:
        yield session
