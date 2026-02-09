"""Image ingestion — load, validate, MIME sniff, base64 encode, hash."""

from __future__ import annotations

import base64
import hashlib
import mimetypes
from dataclasses import dataclass
from pathlib import Path

from labx.config.constants import SUPPORTED_MIME_TYPES


class ImageValidationError(Exception):
    """Raised when an image fails validation."""


@dataclass(frozen=True)
class PreparedImage:
    """An image ready for the Anthropic Messages API."""

    image_id: str  # SHA-256 hex digest
    media_type: str  # e.g. "image/jpeg"
    base64_data: str  # raw base64 (no data:image/... prefix)
    file_name: str


# ── Magic-byte signatures ────────────────────────────────────────
_MAGIC: list[tuple[bytes, str]] = [
    (b"\xff\xd8\xff", "image/jpeg"),
    (b"\x89PNG\r\n\x1a\n", "image/png"),
    (b"RIFF", "image/webp"),  # RIFF....WEBP (check further below)
    (b"GIF87a", "image/gif"),
    (b"GIF89a", "image/gif"),
]


def _sniff_mime(data: bytes) -> str | None:
    """Detect MIME type from magic bytes."""
    for magic, mime in _MAGIC:
        if data[: len(magic)] == magic:
            # Extra check for WEBP inside RIFF container
            if mime == "image/webp" and data[8:12] != b"WEBP":
                continue
            return mime
    return None


def load_image(
    path: Path,
    *,
    max_mb: float = 12.0,
) -> PreparedImage:
    """Load and validate a single image file.

    Returns a ``PreparedImage`` ready for the Anthropic vision block.
    """
    if not path.is_file():
        raise ImageValidationError(f"File not found: {path}")

    data = path.read_bytes()
    size_mb = len(data) / (1024 * 1024)
    if size_mb > max_mb:
        raise ImageValidationError(
            f"Image {path.name} is {size_mb:.1f} MB (limit {max_mb} MB)"
        )

    # MIME detection: magic bytes first, then extension fallback
    mime = _sniff_mime(data)
    if mime is None:
        mime, _ = mimetypes.guess_type(str(path))
    if mime not in SUPPORTED_MIME_TYPES:
        raise ImageValidationError(
            f"Unsupported image type '{mime}' for {path.name}. "
            f"Supported: {', '.join(sorted(SUPPORTED_MIME_TYPES))}"
        )

    sha = hashlib.sha256(data).hexdigest()
    b64 = base64.standard_b64encode(data).decode("ascii")

    return PreparedImage(
        image_id=sha,
        media_type=mime,
        base64_data=b64,
        file_name=path.name,
    )


def load_images(
    paths: list[Path],
    *,
    max_images: int = 10,
    max_mb: float = 12.0,
) -> list[PreparedImage]:
    """Load and validate multiple images.

    Raises ``ImageValidationError`` if count exceeds *max_images*.
    """
    if len(paths) > max_images:
        raise ImageValidationError(
            f"Too many images ({len(paths)}); max allowed is {max_images}"
        )
    if not paths:
        raise ImageValidationError("No images provided")

    return [load_image(p, max_mb=max_mb) for p in paths]
