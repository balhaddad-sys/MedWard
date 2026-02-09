"""Smoke test for the pipeline — uses a mock extractor."""

from __future__ import annotations

import asyncio
from datetime import date
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest

from labx.domain.models import (
    Flag,
    LabAnalyte,
    LabPanel,
    LabReport,
    Observation,
    ReferenceRange,
)
from labx.pipeline.orchestrator import run_full_pipeline
from labx.providers.base import VisionExtractor


class MockExtractor(VisionExtractor):
    """Return a static LabReport for any image."""

    async def extract(self, image):
        return LabReport(
            source_image_id=image.image_id,
            panels=[
                LabPanel(
                    panel_name="BMP",
                    results=[
                        LabAnalyte(
                            raw_name="Sodium",
                            raw_unit="mmol/L",
                            raw_range_text="136 - 145",
                            analyte_key="sodium",
                            display_name="Sodium",
                            unit="mmol/L",
                            unit_canonical="mmol/L",
                            observations=[
                                Observation(
                                    date=date(2024, 1, 1),
                                    value=148.0,
                                    raw_value="148",
                                    flag_extracted=Flag.high,
                                ),
                            ],
                        ),
                        LabAnalyte(
                            raw_name="Potassium",
                            raw_unit="mmol/L",
                            raw_range_text="3.5 - 5.1",
                            analyte_key="potassium",
                            display_name="Potassium",
                            unit="mmol/L",
                            unit_canonical="mmol/L",
                            observations=[
                                Observation(
                                    date=date(2024, 1, 1),
                                    value=3.2,
                                    raw_value="3.2",
                                    flag_extracted=Flag.low,
                                ),
                            ],
                        ),
                    ],
                ),
            ],
        )


@pytest.fixture
def tmp_image(tmp_path: Path) -> Path:
    """Create a minimal valid JPEG file."""
    img = tmp_path / "lab.jpg"
    # Minimal JPEG header (not a real image, but passes magic-byte check)
    img.write_bytes(b"\xff\xd8\xff\xe0" + b"\x00" * 100)
    return img


@pytest.mark.asyncio
async def test_full_pipeline_smoke(tmp_image: Path):
    """The pipeline should run end-to-end with a mock extractor."""
    result = await run_full_pipeline(
        [tmp_image],
        extractor=MockExtractor(),
        enable_summary=False,
    )

    # Should have one report
    assert len(result.reports) == 1

    # Should have merged timeline entries
    assert len(result.merged_timeline) == 2

    # Should have trends
    assert len(result.trends) == 2

    # Sodium should be flagged high
    sodium_trend = next(t for t in result.trends if t.analyte_key == "sodium")
    assert sodium_trend.latest_flag in (Flag.high, Flag.critical_high)

    # Potassium should be flagged low
    k_trend = next(t for t in result.trends if t.analyte_key == "potassium")
    assert k_trend.latest_flag in (Flag.low, Flag.critical_low)


@pytest.mark.asyncio
async def test_pipeline_recomputes_flags(tmp_image: Path):
    """Flags should be recomputed from reference ranges, not just extracted."""
    result = await run_full_pipeline(
        [tmp_image],
        extractor=MockExtractor(),
        enable_summary=False,
    )

    # Check that flag_computed was set
    for analyte in result.merged_timeline:
        for obs in analyte.observations:
            assert obs.flag_computed is not None


@pytest.mark.asyncio
async def test_pipeline_critical_flags(tmp_image: Path):
    """Critical flags should be populated for values far outside range."""

    class CriticalExtractor(VisionExtractor):
        async def extract(self, image):
            return LabReport(
                source_image_id=image.image_id,
                panels=[
                    LabPanel(
                        panel_name="BMP",
                        results=[
                            LabAnalyte(
                                raw_name="Potassium",
                                analyte_key="potassium",
                                unit="mmol/L",
                                unit_canonical="mmol/L",
                                raw_range_text="3.5 - 5.1",
                                observations=[
                                    Observation(
                                        date=date(2024, 1, 1),
                                        value=7.0,
                                        raw_value="7.0",
                                    ),
                                ],
                            ),
                        ],
                    ),
                ],
            )

    result = await run_full_pipeline(
        [tmp_image],
        extractor=CriticalExtractor(),
        enable_summary=False,
    )

    assert len(result.critical_flags) >= 1
    assert result.critical_flags[0].analyte_key == "potassium"
