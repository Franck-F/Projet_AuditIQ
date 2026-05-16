from app.core.config import Settings
from app.integrations.storage import MemoryStorage, get_report_storage


def test_settings_has_reports_bucket_default():
    s = Settings(_env_file=None)
    assert s.storage_bucket_reports == "reports"


def test_settings_reports_bucket_env_override(monkeypatch):
    monkeypatch.setenv("STORAGE_BUCKET_REPORTS", "rpt")
    assert Settings(_env_file=None).storage_bucket_reports == "rpt"


async def test_get_report_storage_is_cached_singleton(monkeypatch):
    from app.core.config import get_settings

    monkeypatch.setenv("API_ENV", "development")
    get_settings.cache_clear()
    get_report_storage.cache_clear()
    try:
        st = get_report_storage()
        assert isinstance(st, MemoryStorage)
        assert get_report_storage() is st
        await st.upload("o/a.xlsx", b"xl", "application/octet-stream")
        assert await get_report_storage().download("o/a.xlsx") == b"xl"
    finally:
        get_report_storage.cache_clear()
        get_settings.cache_clear()
