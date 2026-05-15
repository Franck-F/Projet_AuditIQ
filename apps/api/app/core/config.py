from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    api_env: str = "development"
    supabase_url: str = "https://example.supabase.co"
    supabase_db_url: str = "sqlite+aiosqlite:///./auditiq_dev.db"
    supabase_service_role_key: str = ""
    api_cors_origins: str = "http://localhost:3000"
    api_log_level: str = "info"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.api_cors_origins.split(",") if o.strip()]

    @property
    def jwks_url(self) -> str:
        return f"{self.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"


@lru_cache
def get_settings() -> Settings:
    return Settings()
