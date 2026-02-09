"""Provider interfaces — swap Anthropic / Bedrock / offline OCR safely."""

from __future__ import annotations

from abc import ABC, abstractmethod

from labx.domain.models import AnalysisReport, LabReport
from labx.pipeline.image_io import PreparedImage


class VisionExtractor(ABC):
    """Takes one or more images and returns a validated ``LabReport``."""

    @abstractmethod
    async def extract(self, image: PreparedImage) -> LabReport:
        """Extract lab data from a single image."""

    async def extract_many(self, images: list[PreparedImage]) -> list[LabReport]:
        """Default: sequential extraction. Override for batch support."""
        return [await self.extract(img) for img in images]


class TextSummarizer(ABC):
    """Takes an ``AnalysisReport`` and returns a clinical summary."""

    @abstractmethod
    async def summarize(self, report: AnalysisReport) -> str:
        """Generate a human-readable clinical summary."""
