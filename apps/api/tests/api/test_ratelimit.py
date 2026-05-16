import httpx
import pytest

from app.core import config
from app.main import create_app


@pytest.fixture
def _clear_settings_cache():
    config.get_settings.cache_clear()
    yield
    config.get_settings.cache_clear()


async def test_rate_limit_returns_429_problem(monkeypatch, _clear_settings_cache):
    monkeypatch.setenv("API_RATE_LIMIT_DEFAULT", "2/minute")
    config.get_settings.cache_clear()
    app = create_app()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://t") as c:
        r1 = await c.get("/api/v1/health")
        r2 = await c.get("/api/v1/health")
        r3 = await c.get("/api/v1/health")
    assert r1.status_code == 200
    assert r2.status_code == 200
    assert r3.status_code == 429
    body = r3.json()
    assert body["title"] == "Too Many Requests"
    assert body["status"] == 429
    assert r3.headers["content-type"].startswith("application/problem+json")
