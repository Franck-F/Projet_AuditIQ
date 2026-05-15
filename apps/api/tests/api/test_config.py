from app.core.config import Settings, get_settings


def test_defaults_are_safe_for_dev():
    s = Settings(_env_file=None)
    assert s.api_env == "development"
    assert s.supabase_db_url.startswith("sqlite+aiosqlite")
    assert s.cors_origins == ["http://localhost:3000"]


def test_env_override_and_derived_urls(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://proj.supabase.co/")
    monkeypatch.setenv("API_CORS_ORIGINS", "http://a.com, http://b.com")
    s = Settings(_env_file=None)
    assert s.jwks_url == "https://proj.supabase.co/auth/v1/.well-known/jwks.json"
    assert s.cors_origins == ["http://a.com", "http://b.com"]


def test_get_settings_is_cached():
    assert get_settings() is get_settings()
