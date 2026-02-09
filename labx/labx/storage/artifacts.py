"""Artifact storage — save raw API responses for audit/debug."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path

logger = logging.getLogger(__name__)

_ARTIFACTS_DIR = Path.home() / ".labx" / "artifacts"


class ArtifactStore:
    """Save raw extraction artifacts for debugging and auditing."""

    def __init__(self, artifacts_dir: Path | None = None) -> None:
        self._dir = artifacts_dir or _ARTIFACTS_DIR
        self._dir.mkdir(parents=True, exist_ok=True)

    def save_raw_response(
        self,
        image_id: str,
        raw_text: str,
        *,
        metadata: dict | None = None,
    ) -> Path:
        """Save raw model response text alongside metadata."""
        ts = datetime.now(tz=timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        stem = f"{ts}_{image_id[:16]}"

        response_path = self._dir / f"{stem}_response.txt"
        response_path.write_text(raw_text, encoding="utf-8")

        if metadata:
            meta_path = self._dir / f"{stem}_meta.json"
            meta_path.write_text(
                json.dumps(metadata, indent=2, default=str),
                encoding="utf-8",
            )

        logger.debug("Saved artifact for %s at %s", image_id[:12], response_path)
        return response_path

    def save_report(self, image_id: str, report_json: str) -> Path:
        """Save a validated report JSON for audit trail."""
        ts = datetime.now(tz=timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        path = self._dir / f"{ts}_{image_id[:16]}_report.json"
        path.write_text(report_json, encoding="utf-8")
        return path
