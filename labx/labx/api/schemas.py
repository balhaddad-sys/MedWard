"""FastAPI request/response schemas (thin wrappers over domain models)."""

from __future__ import annotations

from pydantic import BaseModel, Field

from labx.domain.models import AnalysisReport, LabReport


class ExtractResponse(BaseModel):
    """Response for POST /extract."""

    reports: list[LabReport] = Field(default_factory=list)
    image_count: int = 0


class AnalyseResponse(BaseModel):
    """Response for POST /analyse."""

    analysis: AnalysisReport


class HealthResponse(BaseModel):
    """Response for GET /health."""

    status: str = "ok"
    version: str = ""


class ErrorResponse(BaseModel):
    """Standard error envelope."""

    error: str
    detail: str = ""
