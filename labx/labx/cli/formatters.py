"""CLI output formatters — pretty-print and JSON writing."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from labx.domain.models import AnalysisReport, Flag, LabReport


def write_json(data: dict | list, path: Path | None) -> None:
    """Write JSON to a file or stdout."""
    text = json.dumps(data, indent=2, default=str)
    if path:
        path.write_text(text, encoding="utf-8")
    else:
        sys.stdout.write(text + "\n")


def format_reports_summary(reports: list[LabReport]) -> str:
    """Return a human-readable summary of extracted reports."""
    lines: list[str] = []
    for i, r in enumerate(reports, 1):
        total = sum(len(p.results) for p in r.panels)
        lines.append(f"  Report {i}: {total} analytes across {len(r.panels)} panel(s)")
        if r.patient.mrn:
            lines.append(f"    Patient MRN: {r.patient.mrn}")
    return "\n".join(lines)


def format_analysis_summary(analysis: AnalysisReport) -> str:
    """Return a human-readable summary of the full analysis."""
    lines: list[str] = []

    # Critical flags
    if analysis.critical_flags:
        lines.append("CRITICAL VALUES:")
        for t in analysis.critical_flags:
            flag = t.latest_flag.value if t.latest_flag else "?"
            lines.append(
                f"  {t.display_name}: {t.latest_value} ({flag}) "
                f"[{t.direction.value}, {t.pct_change:+.1f}%]"
            )
        lines.append("")

    # Top trends
    non_normal = [
        t for t in analysis.trends
        if t.latest_flag and t.latest_flag != Flag.normal
    ]
    if non_normal:
        lines.append("ABNORMAL VALUES:")
        for t in non_normal[:20]:
            flag = t.latest_flag.value if t.latest_flag else "?"
            lines.append(
                f"  {t.display_name}: {t.latest_value} ({flag}) "
                f"[{t.direction.value}, {t.pct_change:+.1f}%]"
            )
        lines.append("")

    lines.append(
        f"Total: {len(analysis.merged_timeline)} analytes, "
        f"{len(analysis.trends)} trends, "
        f"{len(analysis.critical_flags)} critical"
    )

    if analysis.summary:
        lines.append("")
        lines.append("CLINICAL SUMMARY:")
        lines.append(analysis.summary)

    return "\n".join(lines)
