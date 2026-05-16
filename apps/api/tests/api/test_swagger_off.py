import httpx
import pytest

from app.core import config
from app.main import create_app

_PROD_ENV = {
    "API_ENV": "production",
    "SUPABASE_URL": "https://p.supabase.co",
    "SUPABASE_DB_URL": "postgresql+asyncpg://u:p@h:5432/d",
    "SUPABASE_SERVICE_ROLE_KEY": "k",
    "API_CORS_ORIGINS": "https://app.auditiq.fr",
}


@pytest.fixture
def _clear_settings_cache():
    config.get_settings.cache_clear()
    yield
    config.get_settings.cache_clear()


async def test_docs_disabled_in_production(monkeypatch, _clear_settings_cache):
    for k, v in _PROD_ENV.items():
        monkeypatch.setenv(k, v)
    config.get_settings.cache_clear()
    app = create_app()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://t") as c:
        assert (await c.get("/api/v1/docs")).status_code == 404
        assert (await c.get("/api/v1/openapi.json")).status_code == 404


async def test_docs_enabled_in_dev(_clear_settings_cache):
    config.get_settings.cache_clear()
    app = create_app()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://t") as c:
        assert (await c.get("/api/v1/openapi.json")).status_code == 200
