"""Tests for multi-image merge and de-duplication."""

from datetime import date

from labx.domain.models import (
    LabAnalyte,
    LabPanel,
    LabReport,
    Observation,
    ReferenceRange,
)
from labx.pipeline.merge import merge_reports


def _make_report(
    image_id: str,
    analytes: list[LabAnalyte],
) -> LabReport:
    return LabReport(
        source_image_id=image_id,
        panels=[LabPanel(panel_name="General", results=analytes)],
    )


def _obs(d: str, v: float) -> Observation:
    return Observation(date=date.fromisoformat(d), value=v)


class TestMergeReports:
    def test_single_report_passthrough(self):
        a = LabAnalyte(
            analyte_key="sodium",
            unit_canonical="mmol/L",
            ref_range=ReferenceRange(low=136.0, high=145.0),
            observations=[_obs("2024-01-01", 140.0)],
        )
        merged = merge_reports([_make_report("img1", [a])])
        assert len(merged) == 1
        assert merged[0].analyte_key == "sodium"
        assert len(merged[0].observations) == 1

    def test_merge_two_reports_same_analyte(self):
        a1 = LabAnalyte(
            analyte_key="sodium",
            unit_canonical="mmol/L",
            ref_range=ReferenceRange(low=136.0, high=145.0),
            observations=[_obs("2024-01-01", 140.0)],
        )
        a2 = LabAnalyte(
            analyte_key="sodium",
            unit_canonical="mmol/L",
            ref_range=ReferenceRange(low=136.0, high=145.0),
            observations=[_obs("2024-01-02", 142.0)],
        )
        merged = merge_reports([
            _make_report("img1", [a1]),
            _make_report("img2", [a2]),
        ])
        assert len(merged) == 1
        assert len(merged[0].observations) == 2

    def test_dedup_same_date_value(self):
        """Same observation from two images → keep last image."""
        a1 = LabAnalyte(
            analyte_key="sodium",
            unit_canonical="mmol/L",
            ref_range=ReferenceRange(low=136.0, high=145.0),
            observations=[_obs("2024-01-01", 140.0)],
        )
        a2 = LabAnalyte(
            analyte_key="sodium",
            unit_canonical="mmol/L",
            ref_range=ReferenceRange(low=136.0, high=145.0),
            observations=[_obs("2024-01-01", 140.0)],
        )
        merged = merge_reports([
            _make_report("img1", [a1]),
            _make_report("img2", [a2]),
        ])
        assert len(merged) == 1
        assert len(merged[0].observations) == 1
        # Last image wins
        assert merged[0].observations[0].source_image_id == "img2"

    def test_different_analytes_stay_separate(self):
        a1 = LabAnalyte(
            analyte_key="sodium",
            unit_canonical="mmol/L",
            ref_range=ReferenceRange(low=136.0, high=145.0),
            observations=[_obs("2024-01-01", 140.0)],
        )
        a2 = LabAnalyte(
            analyte_key="potassium",
            unit_canonical="mmol/L",
            ref_range=ReferenceRange(low=3.5, high=5.1),
            observations=[_obs("2024-01-01", 4.0)],
        )
        merged = merge_reports([_make_report("img1", [a1, a2])])
        assert len(merged) == 2

    def test_observations_sorted_by_date(self):
        a1 = LabAnalyte(
            analyte_key="sodium",
            unit_canonical="mmol/L",
            ref_range=ReferenceRange(low=136.0, high=145.0),
            observations=[_obs("2024-01-03", 143.0)],
        )
        a2 = LabAnalyte(
            analyte_key="sodium",
            unit_canonical="mmol/L",
            ref_range=ReferenceRange(low=136.0, high=145.0),
            observations=[_obs("2024-01-01", 140.0)],
        )
        merged = merge_reports([
            _make_report("img1", [a1]),
            _make_report("img2", [a2]),
        ])
        dates = [o.date for o in merged[0].observations]
        assert dates == [date(2024, 1, 1), date(2024, 1, 3)]

    def test_empty_reports(self):
        merged = merge_reports([])
        assert merged == []
