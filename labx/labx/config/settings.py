"""Application settings loaded from environment / .env file."""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── Anthropic ────────────────────────────────────────────────
    anthropic_api_key: str = ""

    model_vision: str = "claude-sonnet-4-20250514"
    model_text: str = "claude-haiku-4-20250414"

    # ── Concurrency / rate-limiting ──────────────────────────────
    concurrency: int = 4
    request_timeout_s: int = 60

    # ── Image constraints ────────────────────────────────────────
    max_images: int = 10
    max_image_mb: float = 12.0

    # ── Feature flags ────────────────────────────────────────────
    enable_summary: bool = True
    cache_enabled: bool = False

    # ── Safety ───────────────────────────────────────────────────
    phi_logging: bool = False

    # ── Server ───────────────────────────────────────────────────
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_workers: int = 1


def get_settings() -> Settings:
    """Return a cached settings instance."""
    return Settings()
