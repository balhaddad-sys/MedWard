"""Reference-range parsing and normalization.

Handles formats commonly found on Kuwait MOH and international lab reports:
  - "3.5 - 5.1"
  - "3.5–5.1"        (en-dash)
  - "3.5—5.1"        (em-dash)
  - "<= 5.0" / "≤ 5.0"
  - ">= 1.0" / "≥ 1.0"
  - "< 5.0"
  - "> 1.0"
  - "Adult: 3.5-5.1; Child: 3.0-4.5"  → keeps first (Adult)
  - "Negative" / "Non-reactive"        → None bounds
"""

from __future__ import annotations

import re

from labx.domain.models import ReferenceRange

# ── Patterns ─────────────────────────────────────────────────────

_NUM = r"[+-]?\d+(?:\.\d+)?"

# "3.5 - 5.1" or "3.5–5.1" or "3.5—5.1" or "3.5 to 5.1"
_RANGE_RE = re.compile(
    rf"(?P<lo>{_NUM})\s*(?:[-–—]|to)\s*(?P<hi>{_NUM})"
)

# "<= 5.0" or "≤5.0" or "< 5.0"
_UPPER_ONLY_RE = re.compile(
    rf"(?:[<≤]\s*=?\s*)(?P<hi>{_NUM})"
)

# ">= 1.0" or "≥1.0" or "> 1.0"
_LOWER_ONLY_RE = re.compile(
    rf"(?:[>≥]\s*=?\s*)(?P<lo>{_NUM})"
)

# Qualitative results that have no numeric range
_QUALITATIVE_RE = re.compile(
    r"(?i)^(negative|non[- ]?reactive|not detected|absent|normal)$"
)


def parse_reference_range(raw: str) -> ReferenceRange:
    """Parse a raw reference-range string into a ``ReferenceRange``."""
    text = raw.strip()
    if not text:
        return ReferenceRange(raw_text=raw)

    # Qualitative → no bounds
    if _QUALITATIVE_RE.match(text):
        return ReferenceRange(raw_text=raw)

    # If there's a semicolon (multi-population), take the first segment
    if ";" in text:
        text = text.split(";")[0].strip()
        # Strip leading label like "Adult:"
        if ":" in text:
            text = text.split(":", 1)[1].strip()

    # Try full range first
    m = _RANGE_RE.search(text)
    if m:
        return ReferenceRange(
            low=float(m.group("lo")),
            high=float(m.group("hi")),
            raw_text=raw,
        )

    # Upper-bound only
    m = _UPPER_ONLY_RE.search(text)
    if m:
        return ReferenceRange(high=float(m.group("hi")), raw_text=raw)

    # Lower-bound only
    m = _LOWER_ONLY_RE.search(text)
    if m:
        return ReferenceRange(low=float(m.group("lo")), raw_text=raw)

    return ReferenceRange(raw_text=raw)
