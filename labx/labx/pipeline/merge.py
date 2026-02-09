"""Multi-image cumulative merge and de-duplication logic.

Kuwait MOH cumulative layouts often repeat rows across images.
This module merges observations from multiple ``LabReport`` objects into
a unified timeline keyed by (analyte_key, unit_canonical, ref_range_signature).
"""

from __future__ import annotations

import logging

from labx.domain.models import LabAnalyte, LabReport, Observation, ReferenceRange

logger = logging.getLogger(__name__)


def _range_signature(ref: ReferenceRange) -> str:
    """Produce a hashable signature for a reference range."""
    lo = f"{ref.low:.4f}" if ref.low is not None else "None"
    hi = f"{ref.high:.4f}" if ref.high is not None else "None"
    return f"{lo}|{hi}"


def _obs_key(obs: Observation) -> str:
    """Unique key for de-duplication: date + value."""
    return f"{obs.date.isoformat()}|{obs.value}"


def _merge_key(analyte: LabAnalyte) -> str:
    """Composite key for matching analytes across images."""
    return f"{analyte.analyte_key}|{analyte.unit_canonical}|{_range_signature(analyte.ref_range)}"


def merge_reports(reports: list[LabReport]) -> list[LabAnalyte]:
    """Merge analytes from multiple reports into a unified timeline.

    De-duplication rules:
      - Key by (analyte_key, unit_canonical, ref_range_signature).
      - For each observation: if same date+value exists, keep the one from the
        later source image (last-image-wins).
      - Preserve ``source_image_id`` on each observation for audit.

    Returns a flat list of ``LabAnalyte`` objects with merged observations.
    """
    # Accumulator: merge_key → LabAnalyte (template) + obs dict
    merged: dict[str, tuple[LabAnalyte, dict[str, Observation]]] = {}

    for report in reports:
        for panel in report.panels:
            for analyte in panel.results:
                key = _merge_key(analyte)

                if key not in merged:
                    # Clone the analyte without observations as the template
                    template = analyte.model_copy(update={"observations": []})
                    merged[key] = (template, {})

                _, obs_dict = merged[key]

                for obs in analyte.observations:
                    # Tag with source image
                    obs.source_image_id = report.source_image_id
                    ok = _obs_key(obs)
                    # Last-image-wins for duplicates
                    obs_dict[ok] = obs

    # Assemble final list
    result: list[LabAnalyte] = []
    for template, obs_dict in merged.values():
        observations = sorted(obs_dict.values(), key=lambda o: o.date)
        template.observations = observations
        result.append(template)

    logger.info(
        "Merged %d reports → %d unique analytes, %d total observations",
        len(reports),
        len(result),
        sum(len(a.observations) for a in result),
    )
    return result
