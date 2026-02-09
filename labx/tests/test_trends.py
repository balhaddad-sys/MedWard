"""Tests for trend computation — direction logic."""

from datetime import date

from labx.domain.models import (
    Flag,
    LabAnalyte,
    Observation,
    ReferenceRange,
    TrendDirection,
)
from labx.domain.trends import compute_trend


def _obs(d: str, v: float, flag: Flag = Flag.normal) -> Observation:
    return Observation(date=date.fromisoformat(d), value=v, flag_computed=flag)


class TestComputeTrend:
    def test_single_observation_stable(self):
        a = LabAnalyte(
            analyte_key="sodium",
            observations=[_obs("2024-01-01", 140.0)],
        )
        t = compute_trend(a)
        assert t.direction == TrendDirection.stable

    def test_high_and_decreasing_improving(self):
        a = LabAnalyte(
            analyte_key="potassium",
            observations=[
                _obs("2024-01-01", 6.0, Flag.high),
                _obs("2024-01-02", 5.5, Flag.high),
                _obs("2024-01-03", 5.2, Flag.high),
            ],
        )
        t = compute_trend(a)
        assert t.direction == TrendDirection.improving

    def test_low_and_increasing_improving(self):
        a = LabAnalyte(
            analyte_key="hemoglobin",
            observations=[
                _obs("2024-01-01", 8.0, Flag.low),
                _obs("2024-01-02", 9.0, Flag.low),
                _obs("2024-01-03", 10.0, Flag.low),
            ],
        )
        t = compute_trend(a)
        assert t.direction == TrendDirection.improving

    def test_high_and_increasing_worsening(self):
        a = LabAnalyte(
            analyte_key="creatinine",
            observations=[
                _obs("2024-01-01", 2.0, Flag.high),
                _obs("2024-01-02", 2.5, Flag.high),
                _obs("2024-01-03", 3.0, Flag.high),
            ],
        )
        t = compute_trend(a)
        assert t.direction == TrendDirection.worsening

    def test_low_and_decreasing_worsening(self):
        a = LabAnalyte(
            analyte_key="platelets",
            observations=[
                _obs("2024-01-01", 120.0, Flag.low),
                _obs("2024-01-02", 100.0, Flag.low),
                _obs("2024-01-03", 80.0, Flag.low),
            ],
        )
        t = compute_trend(a)
        assert t.direction == TrendDirection.worsening

    def test_normal_and_stable(self):
        a = LabAnalyte(
            analyte_key="sodium",
            observations=[
                _obs("2024-01-01", 140.0, Flag.normal),
                _obs("2024-01-02", 141.0, Flag.normal),
                _obs("2024-01-03", 140.0, Flag.normal),
            ],
        )
        t = compute_trend(a)
        assert t.direction == TrendDirection.stable

    def test_fluctuating(self):
        a = LabAnalyte(
            analyte_key="glucose",
            observations=[
                _obs("2024-01-01", 200.0, Flag.high),
                _obs("2024-01-02", 150.0, Flag.high),
                _obs("2024-01-03", 250.0, Flag.high),
                _obs("2024-01-04", 120.0, Flag.high),
                _obs("2024-01-05", 300.0, Flag.high),
            ],
        )
        t = compute_trend(a)
        assert t.direction == TrendDirection.fluctuating

    def test_pct_change_calculated(self):
        a = LabAnalyte(
            analyte_key="creatinine",
            observations=[
                _obs("2024-01-01", 1.0, Flag.normal),
                _obs("2024-01-02", 2.0, Flag.high),
            ],
        )
        t = compute_trend(a)
        assert t.pct_change == 100.0

    def test_latest_value(self):
        a = LabAnalyte(
            analyte_key="sodium",
            observations=[
                _obs("2024-01-01", 140.0),
                _obs("2024-01-02", 145.0),
            ],
        )
        t = compute_trend(a)
        assert t.latest_value == 145.0

    def test_empty_observations(self):
        a = LabAnalyte(analyte_key="sodium")
        t = compute_trend(a)
        assert t.direction == TrendDirection.stable
        assert t.latest_value is None
