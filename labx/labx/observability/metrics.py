"""Prometheus metrics (optional — requires [observability] extras)."""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

# Lazy-initialized metric objects
_extractions_total = None
_extraction_duration = None
_active_extractions = None


def _ensure_metrics() -> bool:
    """Create Prometheus metrics if the client library is available."""
    global _extractions_total, _extraction_duration, _active_extractions  # noqa: PLW0603
    if _extractions_total is not None:
        return True
    try:
        from prometheus_client import Counter, Gauge, Histogram
    except ImportError:
        logger.debug("prometheus_client not installed — metrics disabled")
        return False

    _extractions_total = Counter(
        "labx_extractions_total",
        "Total number of image extractions",
        ["status"],
    )
    _extraction_duration = Histogram(
        "labx_extraction_duration_seconds",
        "Duration of a single image extraction",
        buckets=[0.5, 1, 2, 5, 10, 30, 60],
    )
    _active_extractions = Gauge(
        "labx_active_extractions",
        "Number of extractions currently in progress",
    )
    return True


def inc_extraction(status: str = "success") -> None:
    if _ensure_metrics() and _extractions_total is not None:
        _extractions_total.labels(status=status).inc()


def observe_duration(seconds: float) -> None:
    if _ensure_metrics() and _extraction_duration is not None:
        _extraction_duration.observe(seconds)


def set_active(count: int) -> None:
    if _ensure_metrics() and _active_extractions is not None:
        _active_extractions.set(count)
