"""Pure trend engine — direction, percentage change, volatility.

Direction logic:
  - If high and decreasing → improving
  - If low and increasing → improving
  - If normal and stable → stable
  - If direction keeps reversing → fluctuating
  - Otherwise → worsening
"""

from __future__ import annotations

from labx.domain.models import (
    Flag,
    LabAnalyte,
    LabTrend,
    Observation,
    TrendDirection,
)


def _pct_change(first: float, last: float) -> float:
    if first == 0:
        return 0.0 if last == 0 else 100.0
    return ((last - first) / abs(first)) * 100.0


def _slope_sign(obs: list[Observation]) -> int:
    """Return +1, -1, or 0 based on simple linear direction."""
    if len(obs) < 2:
        return 0
    diffs = [obs[i].value - obs[i - 1].value for i in range(1, len(obs))]
    positive = sum(1 for d in diffs if d > 0)
    negative = sum(1 for d in diffs if d < 0)
    if positive > negative:
        return 1
    if negative > positive:
        return -1
    return 0


def _is_fluctuating(obs: list[Observation]) -> bool:
    """True when direction reverses more than once."""
    if len(obs) < 3:
        return False
    reversals = 0
    prev_sign = 0
    for i in range(1, len(obs)):
        d = obs[i].value - obs[i - 1].value
        sign = 1 if d > 0 else (-1 if d < 0 else 0)
        if sign != 0 and prev_sign != 0 and sign != prev_sign:
            reversals += 1
        if sign != 0:
            prev_sign = sign
    return reversals >= 2


def compute_trend(analyte: LabAnalyte) -> LabTrend:
    """Compute a ``LabTrend`` for a single analyte's observations."""
    obs = sorted(analyte.observations, key=lambda o: o.date)
    if not obs:
        return LabTrend(analyte_key=analyte.analyte_key, display_name=analyte.display_name)

    latest = obs[-1]
    earliest = obs[0]
    pct = _pct_change(earliest.value, latest.value)
    latest_flag = latest.flag_computed or latest.flag_extracted or Flag.normal

    direction = _determine_direction(obs, latest_flag)

    return LabTrend(
        analyte_key=analyte.analyte_key,
        display_name=analyte.display_name,
        direction=direction,
        pct_change=round(pct, 2),
        latest_value=latest.value,
        latest_flag=latest_flag,
        observations=obs,
    )


def _determine_direction(obs: list[Observation], latest_flag: Flag) -> TrendDirection:
    if len(obs) < 2:
        return TrendDirection.stable

    if _is_fluctuating(obs):
        return TrendDirection.fluctuating

    slope = _slope_sign(obs)

    # Towards-normal logic
    if latest_flag in (Flag.high, Flag.critical_high):
        if slope < 0:
            return TrendDirection.improving
        if slope > 0:
            return TrendDirection.worsening
    elif latest_flag in (Flag.low, Flag.critical_low):
        if slope > 0:
            return TrendDirection.improving
        if slope < 0:
            return TrendDirection.worsening
    elif latest_flag == Flag.normal:
        return TrendDirection.stable

    return TrendDirection.stable
