from functools import lru_cache
from pathlib import Path

from pydantic import SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# config.py → app/core ; parents[2] = apps/api, parents[3] = repo root.
_API_DIR = Path(__file__).resolve().parents[2]
_ROOT_DIR = Path(__file__).resolve().parents[3]


def to_async_db_url(url: str) -> str:
    """Normalize a DB URL onto the asyncpg driver.

    SQLAlchemy's `create_async_engine` (used by the app and by Alembic)
    requires an async driver. Supabase hands out a sync `postgresql://…`
    (or `postgres://`) connection string; rewrite its scheme. An
    already-async URL and the sqlite test URL pass through unchanged.
    """
    if url.startswith("postgresql+asyncpg://"):
        return url
    for prefix in (
        "postgresql+psycopg2://",
        "postgresql+psycopg://",
        "postgresql://",
        "postgres://",
    ):
        if url.startswith(prefix):
            return "postgresql+asyncpg://" + url[len(prefix) :]
    return url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        # Absolute, CWD-independent. Repo-root `.env` first, `apps/api/.env`
        # second so the latter wins; missing files are skipped silently.
        env_file=(str(_ROOT_DIR / ".env"), str(_API_DIR / ".env")),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    api_env: str = "development"
    supabase_url: str = "https://example.supabase.co"
    supabase_db_url: str = "sqlite+aiosqlite:///./auditiq_dev.db"
    supabase_service_role_key: SecretStr = SecretStr("")
    api_cors_origins: str = "http://localhost:3000"
    api_log_level: str = "info"
    storage_bucket: str = "datasets"
    max_upload_mb: int = 10
    retention_days_default: int = 30
    gemini_api_key: SecretStr = SecretStr("")
    gemini_model: str = "gemini-2.5-flash"  # 1.5 models retired in 2025
    api_rate_limit_default: str = "60/minute"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.api_cors_origins.split(",") if o.strip()]

    @property
    def jwks_url(self) -> str:
        return f"{self.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"

    @property
    def database_url(self) -> str:
        """Async-driver DB URL for SQLAlchemy. The raw `supabase_db_url`
        is kept as-is so the sqlite-guard validator still sees the scheme."""
        return to_async_db_url(self.supabase_db_url)

    @model_validator(mode="after")
    def _require_secrets_outside_dev(self) -> "Settings":
        if self.api_env.lower() == "development":
            return self
        missing: list[str] = []
        if not self.supabase_service_role_key.get_secret_value():
            missing.append("SUPABASE_SERVICE_ROLE_KEY")
        if not self.supabase_url or self.supabase_url == "https://example.supabase.co":
            missing.append("SUPABASE_URL")
        if self.supabase_db_url.startswith("sqlite"):
            missing.append("SUPABASE_DB_URL")
        if missing:
            raise ValueError(
                "Variables requises hors environnement de développement "
                f"manquantes : {', '.join(missing)}"
            )
        if "*" in self.cors_origins:
            raise ValueError(
                "API_CORS_ORIGINS='*' est interdit hors développement "
                "(incompatible avec allow_credentials=True)."
            )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
