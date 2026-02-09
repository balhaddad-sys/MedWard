"""Anthropic Vision extraction — single-image → validated LabReport."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from labx.config.settings import Settings, get_settings
from labx.domain.models import LabReport
from labx.pipeline.image_io import PreparedImage
from labx.providers.anthropic_client import get_client
from labx.providers.base import VisionExtractor

logger = logging.getLogger(__name__)

_PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "vision_extract.md"


def _load_prompt() -> str:
    return _PROMPT_PATH.read_text(encoding="utf-8")


def _build_messages(image: PreparedImage, prompt: str) -> list[dict[str, Any]]:
    """Build the Messages API ``messages`` array with an image block."""
    return [
        {
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": image.media_type,
                        "data": image.base64_data,
                    },
                },
                {
                    "type": "text",
                    "text": prompt,
                },
            ],
        }
    ]


def _extract_json(text: str) -> dict[str, Any]:
    """Extract the first JSON object from the model response text."""
    # Try direct parse first
    text = text.strip()
    if text.startswith("{"):
        return json.loads(text)  # type: ignore[no-any-return]

    # Try to find JSON within markdown code fences
    for marker in ("```json", "```"):
        if marker in text:
            start = text.index(marker) + len(marker)
            end = text.index("```", start)
            return json.loads(text[start:end].strip())  # type: ignore[no-any-return]

    raise ValueError("No JSON object found in model response")


class AnthropicVisionExtractor(VisionExtractor):
    """Extract lab data from a single image using Claude Vision."""

    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()
        self._prompt = _load_prompt()

    async def extract(self, image: PreparedImage) -> LabReport:
        client = get_client(self._settings)
        messages = _build_messages(image, self._prompt)

        response = await client.messages.create(
            model=self._settings.model_vision,
            max_tokens=4096,
            temperature=0,
            system="You are a clinical lab report extraction engine. Output ONLY valid JSON. No markdown, no explanation.",
            messages=messages,
        )

        raw_text = response.content[0].text  # type: ignore[union-attr]
        logger.debug("Vision raw response length: %d chars", len(raw_text))

        try:
            data = _extract_json(raw_text)
        except (json.JSONDecodeError, ValueError) as exc:
            logger.warning("JSON parse failed, attempting repair pass: %s", exc)
            data = await self._repair_json(raw_text)

        report = LabReport.model_validate(data)
        report.source_image_id = image.image_id
        report.raw_json = data
        return report

    async def _repair_json(self, broken: str) -> dict[str, Any]:
        """Ask the model to fix malformed JSON output."""
        client = get_client(self._settings)
        resp = await client.messages.create(
            model=self._settings.model_text,
            max_tokens=4096,
            temperature=0,
            system="Fix the following broken JSON so it is valid. Output ONLY the corrected JSON.",
            messages=[{"role": "user", "content": broken}],
        )
        return json.loads(resp.content[0].text)  # type: ignore[union-attr, no-any-return]
