"""Application-wide constants — flags, MIME types, critical multipliers."""

from __future__ import annotations

# ── Supported image MIME types (Claude Messages API) ─────────────
SUPPORTED_MIME_TYPES: frozenset[str] = frozenset(
    {
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
    }
)

# ── Flag labels ──────────────────────────────────────────────────
FLAG_NORMAL = "normal"
FLAG_LOW = "low"
FLAG_HIGH = "high"
FLAG_CRITICAL_LOW = "critical_low"
FLAG_CRITICAL_HIGH = "critical_high"

ALL_FLAGS = frozenset(
    {FLAG_NORMAL, FLAG_LOW, FLAG_HIGH, FLAG_CRITICAL_LOW, FLAG_CRITICAL_HIGH}
)

# ── Critical threshold multiplier ───────────────────────────────
# Default: a value >50 % beyond the reference boundary is critical.
DEFAULT_CRITICAL_MULTIPLIER: float = 0.50

# Per-analyte overrides (analyte_key → multiplier).
# For example, potassium has a tighter critical window.
CRITICAL_MULTIPLIER_OVERRIDES: dict[str, float] = {
    "potassium": 0.20,
    "sodium": 0.10,
    "glucose": 0.50,
    "calcium": 0.25,
    "magnesium": 0.30,
    "phosphate": 0.30,
    "troponin_i": 0.0,  # any elevation is critical
    "troponin_t": 0.0,
    "inr": 0.50,
}

# ── Concurrency defaults ────────────────────────────────────────
MAX_RETRIES = 3
RETRY_BASE_DELAY_S = 1.0
RETRY_MAX_DELAY_S = 30.0

# ── Image processing ────────────────────────────────────────────
RECOMMENDED_MAX_WIDTH_PX = 1920
