"""Concurrency control — semaphore, retry with exponential backoff, rate limiting."""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Awaitable, Callable
from typing import TypeVar

from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from labx.config.constants import MAX_RETRIES, RETRY_BASE_DELAY_S, RETRY_MAX_DELAY_S

logger = logging.getLogger(__name__)

T = TypeVar("T")


def with_retry() -> Callable:  # type: ignore[type-arg]
    """Tenacity retry decorator for transient API errors.

    Retries on:
      - 429 rate-limit (via anthropic.RateLimitError)
      - 5xx server errors (via anthropic.InternalServerError)
      - Network / timeout errors
    """
    try:
        from anthropic import APIStatusError, APITimeoutError
    except ImportError:
        # Fallback if anthropic isn't installed — retry on generic exceptions
        return retry(
            stop=stop_after_attempt(MAX_RETRIES),
            wait=wait_exponential(
                multiplier=RETRY_BASE_DELAY_S, max=RETRY_MAX_DELAY_S
            ),
            reraise=True,
        )

    def _is_retryable(exc: BaseException) -> bool:
        if isinstance(exc, APITimeoutError):
            return True
        if isinstance(exc, APIStatusError):
            return exc.status_code in (429, 500, 502, 503, 529)
        return False

    return retry(
        retry=retry_if_exception_type((APITimeoutError, APIStatusError)).wraps(
            lambda rs: _is_retryable(rs.outcome.exception())  # type: ignore[union-attr]
            if rs.outcome and rs.outcome.exception()
            else False
        ),
        stop=stop_after_attempt(MAX_RETRIES),
        wait=wait_exponential(multiplier=RETRY_BASE_DELAY_S, max=RETRY_MAX_DELAY_S),
        reraise=True,
        before_sleep=lambda rs: logger.warning(
            "Retry attempt %d after %s", rs.attempt_number, rs.outcome.exception()  # type: ignore[union-attr]
        ),
    )


async def run_concurrently(
    tasks: list[Callable[[], Awaitable[T]]],
    *,
    max_concurrent: int = 4,
) -> list[T]:
    """Run *tasks* with bounded concurrency via an ``asyncio.Semaphore``.

    Each element in *tasks* is a zero-arg async callable (e.g. a lambda or partial).
    Returns results in the same order as *tasks*.
    """
    semaphore = asyncio.Semaphore(max_concurrent)

    async def _guarded(idx: int, fn: Callable[[], Awaitable[T]]) -> tuple[int, T]:
        async with semaphore:
            logger.debug("Starting task %d (semaphore slots: %d)", idx, max_concurrent)
            result = await fn()
            return idx, result

    coros = [_guarded(i, fn) for i, fn in enumerate(tasks)]
    completed = await asyncio.gather(*coros, return_exceptions=True)

    # Preserve order and re-raise first exception
    ordered: list[T | BaseException] = [None] * len(tasks)  # type: ignore[list-item]
    for item in completed:
        if isinstance(item, BaseException):
            raise item
        idx, val = item
        ordered[idx] = val

    return ordered  # type: ignore[return-value]
