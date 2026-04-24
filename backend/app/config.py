"""Runtime configuration loaded from environment."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


REPO_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=[REPO_ROOT / ".env", REPO_ROOT / "backend" / ".env"],
        env_file_encoding="utf-8",
        extra="ignore",
    )

    glm_api_key: str = Field(..., alias="GLM_API_KEY")
    glm_base_url: str = Field("https://api.ilmu.ai/v1", alias="GLM_BASE_URL")
    glm_model: str = Field("ilmu-glm-5.1", alias="GLM_MODEL")

    database_url: str = Field(
        f"sqlite:///{REPO_ROOT / 'var' / 'dev.sqlite'}",
        alias="DATABASE_URL",
    )

    storage_backend: str = Field("local", alias="STORAGE_BACKEND")
    storage_path: str = Field(str(REPO_ROOT / "var" / "uploads"), alias="STORAGE_PATH")

    app_env: str = Field("dev", alias="APP_ENV")
    log_level: str = Field("INFO", alias="LOG_LEVEL")


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
