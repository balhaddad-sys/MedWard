"""OpenTelemetry tracing hooks (optional — requires [observability] extras)."""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def setup_tracing(service_name: str = "labx") -> None:
    """Initialize OpenTelemetry tracing if the SDK is installed."""
    try:
        from opentelemetry import trace
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import (
            BatchSpanProcessor,
            ConsoleSpanExporter,
        )
    except ImportError:
        logger.debug("OpenTelemetry SDK not installed — tracing disabled")
        return

    resource = Resource.create({"service.name": service_name})
    provider = TracerProvider(resource=resource)
    provider.add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))
    trace.set_tracer_provider(provider)
    logger.info("OpenTelemetry tracing initialized for '%s'", service_name)
