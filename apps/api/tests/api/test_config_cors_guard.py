import pytest
from pydantic import ValidationError

from app.core.config import Settings

_PROD = {
    "api_env": "production",
    "supabase_url": "https://p.supabase.co",
    "supabase_db_url": "postgresql+asyncpg://u:p@h:5432/d",
    "supabase_service_role_key": "k",
}


def test_wildcard_cors_rejected_outside_dev():
    with pytest.raises(ValidationError):
        Settings(_env_file=None, api_cors_origins="*", **_PROD)


def test_wildcard_cors_allowed_in_dev():
    s = Settings(_env_file=None, api_env="development", api_cors_origins="*")
    assert s.cors_origins == ["*"]


def test_explicit_cors_ok_in_prod():
    s = Settings(_env_file=None, api_cors_origins="https://app.auditiq.fr",
                 **_PROD)
    assert s.cors_origins == ["https://app.auditiq.fr"]
