"""Severity scoring and sorting — critical-first ordering.

Score components:
  1. Flag weight   (critical > high/low > normal)
  2. Direction weight (worsening > fluctuating > stable > improving)
  3. Magnitude weight (abs pct_change, capped)
"""

from __future__ import annotations

from labx.domain.models import Flag, LabTrend, TrendDirection

_FLAG_WEIGHT: dict[Flag, float] = {
    Flag.critical_high: 100.0,
    Flag.critical_low: 100.0,
    Flag.high: 50.0,
    Flag.low: 50.0,
    Flag.normal: 0.0,
}

_DIRECTION_WEIGHT: dict[TrendDirection, float] = {
    TrendDirection.worsening: 30.0,
    TrendDirection.fluctuating: 15.0,
    TrendDirection.stable: 0.0,
    TrendDirection.improving: -10.0,
}


def compute_severity(trend: LabTrend) -> float:
    """Return a numeric severity score (higher = more urgent)."""
    flag_w = _FLAG_WEIGHT.get(trend.latest_flag or Flag.normal, 0.0)
    dir_w = _DIRECTION_WEIGHT.get(trend.direction, 0.0)
    mag_w = min(abs(trend.pct_change), 200.0) * 0.1  # cap contribution at 20
    return round(flag_w + dir_w + mag_w, 2)


def sort_trends_by_severity(trends: list[LabTrend]) -> list[LabTrend]:
    """Return trends sorted by severity, most urgent first."""
    for t in trends:
        t.severity_score = compute_severity(t)
    return sorted(trends, key=lambda t: t.severity_score, reverse=True)
