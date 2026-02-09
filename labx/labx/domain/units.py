"""Unit normalization and conversion tables.

Strategy:
  1. Normalize unit strings to a canonical form (lowercase, collapsed whitespace).
  2. Map common aliases to a single canonical key.
  3. Provide conversion factors where safe (e.g. g/dL ↔ g/L).
"""

from __future__ import annotations

import re

# ── Alias → canonical unit mapping ───────────────────────────────
_UNIT_ALIASES: dict[str, str] = {
    # Volume
    "ml": "mL",
    "dl": "dL",
    "l": "L",
    # Concentration
    "mmol/l": "mmol/L",
    "umol/l": "umol/L",
    "µmol/l": "umol/L",
    "nmol/l": "nmol/L",
    "meq/l": "mEq/L",
    "mg/dl": "mg/dL",
    "mg/l": "mg/L",
    "g/dl": "g/dL",
    "g/l": "g/L",
    "ng/ml": "ng/mL",
    "ng/dl": "ng/dL",
    "pg/ml": "pg/mL",
    "ug/ml": "ug/mL",
    "µg/ml": "ug/mL",
    "iu/l": "IU/L",
    "u/l": "U/L",
    "iu/ml": "IU/mL",
    # Cells
    "x10^9/l": "x10^9/L",
    "x10^12/l": "x10^12/L",
    "x10e9/l": "x10^9/L",
    "x10e12/l": "x10^12/L",
    "10^9/l": "x10^9/L",
    "10^12/l": "x10^12/L",
    "thou/ul": "x10^3/uL",
    "mil/ul": "x10^6/uL",
    "k/ul": "x10^3/uL",
    # Percent
    "%": "%",
    "percent": "%",
    # Time
    "sec": "s",
    "seconds": "s",
    "s": "s",
    # Misc
    "fl": "fL",
    "pg": "pg",
    "mm/hr": "mm/hr",
    "mm/h": "mm/hr",
    "ratio": "ratio",
}

# ── Conversion factors: (from_unit, to_unit) → multiplier ──────
_CONVERSIONS: dict[tuple[str, str], float] = {
    ("g/dL", "g/L"): 10.0,
    ("g/L", "g/dL"): 0.1,
    ("mg/dL", "mg/L"): 10.0,
    ("mg/L", "mg/dL"): 0.1,
    ("umol/L", "mg/dL"): 0.0113,  # creatinine-specific; kept as approx
    ("ng/mL", "ug/L"): 1.0,
    ("ug/L", "ng/mL"): 1.0,
    ("mEq/L", "mmol/L"): 1.0,  # for monovalent ions
    ("mmol/L", "mEq/L"): 1.0,
}


def normalize_unit(raw: str) -> str:
    """Return the canonical unit string for *raw*."""
    cleaned = re.sub(r"\s+", "", raw.strip()).lower()
    return _UNIT_ALIASES.get(cleaned, raw.strip())


def convert_value(value: float, from_unit: str, to_unit: str) -> float | None:
    """Convert *value* from *from_unit* to *to_unit*.

    Returns ``None`` if no conversion is known.
    """
    f = normalize_unit(from_unit)
    t = normalize_unit(to_unit)
    if f == t:
        return value
    factor = _CONVERSIONS.get((f, t))
    if factor is None:
        return None
    return value * factor
