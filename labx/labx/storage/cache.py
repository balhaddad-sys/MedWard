"""Optional disk/redis cache keyed by image SHA-256 hash.

When enabled, extraction results for a given image are cached so that
re-uploading the same image skips the API call entirely.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

from labx.domain.models import LabReport

logger = logging.getLogger(__name__)

_CACHE_DIR = Path.home() / ".labx" / "cache"


class DiskCache:
    """Simple file-system cache: one JSON file per image hash."""

    def __init__(self, cache_dir: Path | None = None) -> None:
        self._dir = cache_dir or _CACHE_DIR
        self._dir.mkdir(parents=True, exist_ok=True)

    def _path(self, image_id: str) -> Path:
        return self._dir / f"{image_id}.json"

    def get(self, image_id: str) -> LabReport | None:
        p = self._path(image_id)
        if not p.exists():
            return None
        try:
            data = json.loads(p.read_text(encoding="utf-8"))
            report = LabReport.model_validate(data)
            logger.debug("Cache hit for %s", image_id[:12])
            return report
        except Exception:
            logger.warning("Cache read failed for %s, ignoring", image_id[:12])
            return None

    def put(self, image_id: str, report: LabReport) -> None:
        p = self._path(image_id)
        try:
            p.write_text(
                report.model_dump_json(indent=2),
                encoding="utf-8",
            )
            logger.debug("Cached result for %s", image_id[:12])
        except Exception:
            logger.warning("Cache write failed for %s", image_id[:12])

    def clear(self) -> int:
        """Remove all cached entries. Returns count of removed files."""
        count = 0
        for f in self._dir.glob("*.json"):
            f.unlink(missing_ok=True)
            count += 1
        return count
