"""API security — API-key authentication, CORS, size limits."""

from __future__ import annotations

import logging
import os

from fastapi import HTTPException, Security
from fastapi.security import APIKeyHeader

logger = logging.getLogger(__name__)

_API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(
    api_key: str | None = Security(_API_KEY_HEADER),
) -> str:
    """Validate the X-API-Key header against the configured server key.

    If ``LABX_API_KEY`` is not set in the environment, authentication is
    disabled (development mode).
    """
    expected = os.environ.get("LABX_API_KEY")
    if not expected:
        # No key configured → auth disabled
        return "anonymous"
    if not api_key or api_key != expected:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
    return api_key
