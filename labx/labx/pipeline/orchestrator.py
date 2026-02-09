"""Pipeline orchestrator — run_full_pipeline().

This is the single source of truth for the end-to-end extraction flow:
  1. Load & validate images
  2. Extract lab data (concurrent, with retry)
  3. Post-process (normalize, recompute flags)
  4. Merge across images
  5. Compute trends & severity
  6. (Optional) Generate clinical summary
"""

from __future__ import annotations

import logging
from pathlib import Path

from labx.config.settings import Settings, get_settings
from labx.domain.models import AnalysisReport, LabReport, LabTrend
from labx.domain.severity import sort_trends_by_severity
from labx.domain.trends import compute_trend
from labx.pipeline.concurrency import run_concurrently
from labx.pipeline.image_io import PreparedImage, load_images
from labx.pipeline.merge import merge_reports
from labx.pipeline.postprocess import postprocess_reports
from labx.providers.anthropic_text import AnthropicTextSummarizer
from labx.providers.anthropic_vision import AnthropicVisionExtractor
from labx.providers.base import TextSummarizer, VisionExtractor

logger = logging.getLogger(__name__)


async def run_full_pipeline(
    image_paths: list[Path],
    *,
    settings: Settings | None = None,
    extractor: VisionExtractor | None = None,
    summarizer: TextSummarizer | None = None,
    enable_summary: bool | None = None,
) -> AnalysisReport:
    """Execute the full lab extraction and analysis pipeline.

    Parameters
    ----------
    image_paths:
        Paths to lab report images (1–10).
    settings:
        Override application settings (uses env defaults if ``None``).
    extractor:
        Override the vision extractor (useful for testing with mocks).
    summarizer:
        Override the text summarizer.
    enable_summary:
        Whether to generate a clinical summary. Defaults to ``settings.enable_summary``.
    """
    s = settings or get_settings()
    if enable_summary is None:
        enable_summary = s.enable_summary

    # ── 1. Load & validate images ────────────────────────────────
    logger.info("Loading %d image(s)…", len(image_paths))
    images = load_images(image_paths, max_images=s.max_images, max_mb=s.max_image_mb)

    # ── 2. Extract (concurrent) ──────────────────────────────────
    ext = extractor or AnthropicVisionExtractor(s)
    logger.info("Extracting lab data from %d image(s) (concurrency=%d)…", len(images), s.concurrency)

    reports = await _extract_all(ext, images, concurrency=s.concurrency)
    logger.info("Extracted %d report(s)", len(reports))

    # ── 3. Post-process ──────────────────────────────────────────
    reports = postprocess_reports(reports)

    # ── 4. Merge ─────────────────────────────────────────────────
    merged_timeline = merge_reports(reports)

    # ── 5. Trends & severity ─────────────────────────────────────
    trends = [compute_trend(a) for a in merged_timeline]
    trends = sort_trends_by_severity(trends)

    from labx.domain.models import Flag

    critical = [
        t
        for t in trends
        if t.latest_flag in (Flag.critical_high, Flag.critical_low)
    ]

    # ── 6. Assemble report ───────────────────────────────────────
    analysis = AnalysisReport(
        reports=reports,
        merged_timeline=merged_timeline,
        trends=trends,
        critical_flags=critical,
    )

    # ── 7. Optional summary ──────────────────────────────────────
    if enable_summary:
        logger.info("Generating clinical summary…")
        summ = summarizer or AnthropicTextSummarizer(s)
        analysis.summary = await summ.summarize(analysis)

    logger.info(
        "Pipeline complete: %d analytes, %d trends, %d critical",
        len(merged_timeline),
        len(trends),
        len(critical),
    )
    return analysis


async def run_extract_only(
    image_paths: list[Path],
    *,
    settings: Settings | None = None,
    extractor: VisionExtractor | None = None,
) -> list[LabReport]:
    """Extract and post-process without merging or trending."""
    s = settings or get_settings()
    images = load_images(image_paths, max_images=s.max_images, max_mb=s.max_image_mb)
    ext = extractor or AnthropicVisionExtractor(s)
    reports = await _extract_all(ext, images, concurrency=s.concurrency)
    return postprocess_reports(reports)


async def _extract_all(
    extractor: VisionExtractor,
    images: list[PreparedImage],
    *,
    concurrency: int = 4,
) -> list[LabReport]:
    """Extract from all images with bounded concurrency."""
    tasks = [lambda img=img: extractor.extract(img) for img in images]
    return await run_concurrently(tasks, max_concurrent=concurrency)
