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

    ``LABX_API_KEY`` MUST be set. Auth is never silently disabled —
    if the env var is missing the service rejects all requests with 503.
    """
    expected = os.environ.get("LABX_API_KEY")
    if not expected:
        logger.error("LABX_API_KEY is not configured — all requests rejected")
        raise HTTPException(
            status_code=503,
            detail="Service misconfigured. Contact the administrator.",
        )
    if not api_key or api_key != expected:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
    return api_key
