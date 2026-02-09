"""Core Pydantic domain models for lab extraction, analysis, and trending."""

from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


# ── Enums ────────────────────────────────────────────────────────


class Flag(str, Enum):
    normal = "normal"
    low = "low"
    high = "high"
    critical_low = "critical_low"
    critical_high = "critical_high"


class TrendDirection(str, Enum):
    improving = "improving"
    worsening = "worsening"
    stable = "stable"
    fluctuating = "fluctuating"


# ── Value objects ────────────────────────────────────────────────


class ReferenceRange(BaseModel):
    """Parsed numeric reference range."""

    low: float | None = None
    high: float | None = None
    raw_text: str = ""

    @property
    def is_bounded(self) -> bool:
        return self.low is not None or self.high is not None


class Observation(BaseModel):
    """A single measured value on a specific date."""

    date: date
    value: float
    raw_value: str = ""
    flag_extracted: Flag | None = None
    flag_computed: Flag | None = None
    source_image_id: str = ""


class PatientMeta(BaseModel):
    """De-identified patient metadata extracted from a report."""

    mrn: str = ""
    name: str = ""
    dob: date | None = None
    gender: str = ""
    location: str = ""
    extra: dict[str, Any] = Field(default_factory=dict)


# ── Analyte / Panel / Report ─────────────────────────────────────


class LabAnalyte(BaseModel):
    """One lab test with its observations across dates."""

    # Raw extracted fields (kept for audit)
    raw_name: str = ""
    raw_unit: str = ""
    raw_range_text: str = ""

    # Normalized fields (used for computation)
    analyte_key: str = ""  # e.g. "creatinine"
    display_name: str = ""  # e.g. "Creatinine"
    unit: str = ""  # original unit
    unit_canonical: str = ""  # target canonical unit
    ref_range: ReferenceRange = Field(default_factory=ReferenceRange)

    observations: list[Observation] = Field(default_factory=list)


class LabPanel(BaseModel):
    """A logical grouping of analytes (e.g. CBC, BMP)."""

    panel_name: str = ""
    results: list[LabAnalyte] = Field(default_factory=list)


class LabReport(BaseModel):
    """Extraction result from a single image."""

    source_image_id: str = ""
    captured_at: datetime | None = None
    patient: PatientMeta = Field(default_factory=PatientMeta)
    panels: list[LabPanel] = Field(default_factory=list)
    raw_json: dict[str, Any] | None = None


# ── Trend ────────────────────────────────────────────────────────


class LabTrend(BaseModel):
    """Trend computed for one analyte across observations."""

    analyte_key: str
    display_name: str = ""
    direction: TrendDirection = TrendDirection.stable
    pct_change: float = 0.0
    latest_value: float | None = None
    latest_flag: Flag | None = None
    severity_score: float = 0.0
    observations: list[Observation] = Field(default_factory=list)


# ── Analysis (top-level output) ──────────────────────────────────


class AnalysisReport(BaseModel):
    """Full analysis output: extracted reports + trends + summary."""

    reports: list[LabReport] = Field(default_factory=list)
    merged_timeline: list[LabAnalyte] = Field(default_factory=list)
    trends: list[LabTrend] = Field(default_factory=list)
    critical_flags: list[LabTrend] = Field(default_factory=list)
    summary: str = ""
