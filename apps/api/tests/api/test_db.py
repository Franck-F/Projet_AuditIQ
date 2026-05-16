from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core.db import make_engine


async def test_engine_executes_select(tmp_path):
    url = f"sqlite+aiosqlite:///{tmp_path / 'x.db'}"
    eng = make_engine(url)
    sm = async_sessionmaker(eng, expire_on_commit=False)
    async with sm() as s:
        result = await s.execute(text("select 1"))
        assert result.scalar_one() == 1
    await eng.dispose()
