from functools import lru_cache

from pydantic import SecretStr, model_validator
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
    supabase_service_role_key: SecretStr = SecretStr("")
    api_cors_origins: str = "http://localhost:3000"
    api_log_level: str = "info"
    storage_bucket: str = "datasets"
    max_upload_mb: int = 10
    retention_days_default: int = 30
    gemini_api_key: SecretStr = SecretStr("")
    gemini_model: str = "gemini-1.5-pro"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.api_cors_origins.split(",") if o.strip()]

    @property
    def jwks_url(self) -> str:
        return f"{self.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"

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
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
