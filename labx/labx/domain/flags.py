"""Flag recomputation — the single source of truth for H/L/critical.

Rules:
  1. Compare value against ref_range.low / ref_range.high.
  2. If outside range by more than the critical multiplier → critical.
  3. Critical multiplier is per-analyte configurable (see constants.py).
"""

from __future__ import annotations

from labx.config.constants import (
    CRITICAL_MULTIPLIER_OVERRIDES,
    DEFAULT_CRITICAL_MULTIPLIER,
)
from labx.domain.models import Flag, ReferenceRange


def compute_flag(
    value: float,
    ref: ReferenceRange,
    analyte_key: str = "",
) -> Flag:
    """Compute the flag for a single observation."""
    if not ref.is_bounded:
        return Flag.normal

    multiplier = CRITICAL_MULTIPLIER_OVERRIDES.get(
        analyte_key, DEFAULT_CRITICAL_MULTIPLIER
    )

    # ── High side ────────────────────────────────────────────────
    if ref.high is not None and value > ref.high:
        span = ref.high - (ref.low or 0.0)
        threshold = ref.high + span * multiplier if span > 0 else ref.high
        if value > threshold:
            return Flag.critical_high
        return Flag.high

    # ── Low side ─────────────────────────────────────────────────
    if ref.low is not None and value < ref.low:
        span = (ref.high or ref.low) - ref.low
        threshold = ref.low - span * multiplier if span > 0 else ref.low
        if value < threshold:
            return Flag.critical_low
        return Flag.low

    return Flag.normal
