"""Anthropic text summarizer — AnalysisReport → clinical summary."""

from __future__ import annotations

import logging
from pathlib import Path

from labx.config.settings import Settings, get_settings
from labx.domain.models import AnalysisReport
from labx.providers.anthropic_client import get_client
from labx.providers.base import TextSummarizer

logger = logging.getLogger(__name__)

_SUMMARY_PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "summary.md"


def _load_summary_prompt() -> str:
    if _SUMMARY_PROMPT_PATH.exists():
        return _SUMMARY_PROMPT_PATH.read_text(encoding="utf-8")
    return (
        "You are a clinical lab analyst. Given the structured lab analysis below, "
        "write a concise clinical summary. Highlight critical values, trends, and "
        "recommended follow-ups. Use clear medical language suitable for a physician."
    )


class AnthropicTextSummarizer(TextSummarizer):
    """Generate a clinical summary from an ``AnalysisReport``."""

    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()
        self._prompt = _load_summary_prompt()

    async def summarize(self, report: AnalysisReport) -> str:
        client = get_client(self._settings)

        # Serialize the analysis (excluding raw_json to save tokens)
        payload = report.model_dump(exclude={"reports": {"__all__": {"raw_json"}}})

        resp = await client.messages.create(
            model=self._settings.model_text,
            max_tokens=2048,
            temperature=0,
            system=self._prompt,
            messages=[
                {
                    "role": "user",
                    "content": f"Analyze the following lab results:\n\n{payload}",
                }
            ],
        )

        summary = resp.content[0].text  # type: ignore[union-attr]
        logger.debug("Summary length: %d chars", len(summary))
        return summary
