"""Thin Anthropic SDK wrapper — shared client lifecycle."""

from __future__ import annotations

from anthropic import AsyncAnthropic

from labx.config.settings import Settings, get_settings


_client: AsyncAnthropic | None = None


def get_client(settings: Settings | None = None) -> AsyncAnthropic:
    """Return (and lazily create) a shared ``AsyncAnthropic`` client."""
    global _client  # noqa: PLW0603
    if _client is None:
        s = settings or get_settings()
        _client = AsyncAnthropic(
            api_key=s.anthropic_api_key,
            timeout=float(s.request_timeout_s),
        )
    return _client


def reset_client() -> None:
    """Tear down the cached client (useful in tests)."""
    global _client  # noqa: PLW0603
    _client = None
