from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # App
    app_name: str = "Meezan API"
    app_version: str = "1.0.0"
    debug: bool = False

    # Database — accepts plain postgresql:// or postgresql+asyncpg://
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/meezan"

    @field_validator("database_url", mode="before")
    @classmethod
    def fix_db_url(cls, v: str) -> str:
        if isinstance(v, str) and v.startswith("postgresql://"):
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""

    # External APIs
    gold_api_key: str = ""
    fmp_api_key: str = ""
    alpha_vantage_key: str = ""
    zoya_api_key: str = ""

    # Redis
    redis_url: str = "redis://localhost:6379"

    # CORS
    allowed_origins: list[str] = ["http://localhost:8081", "http://localhost:3000"]

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            s = v.strip()
            # Handle JSON array format: ["origin1","origin2"]
            if s.startswith("["):
                import json
                try:
                    return json.loads(s)
                except json.JSONDecodeError:
                    pass
            # Fallback: comma-separated plain string
            return [o.strip() for o in s.split(",") if o.strip()]
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()
