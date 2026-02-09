"""Simple benchmark: measure extraction time across sample images."""

from __future__ import annotations

import asyncio
import sys
import time
from pathlib import Path


async def main() -> None:
    from labx.config.settings import get_settings
    from labx.pipeline.orchestrator import run_full_pipeline

    if len(sys.argv) < 2:
        print("Usage: python benchmark.py <image_dir>")
        sys.exit(1)

    img_dir = Path(sys.argv[1])
    images = sorted(
        p for p in img_dir.iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
    )
    if not images:
        print(f"No images found in {img_dir}")
        sys.exit(1)

    print(f"Benchmarking {len(images)} image(s) from {img_dir}")

    start = time.perf_counter()
    result = await run_full_pipeline(images, enable_summary=False)
    elapsed = time.perf_counter() - start

    print(f"\nResults:")
    print(f"  Images processed: {len(images)}")
    print(f"  Analytes extracted: {len(result.merged_timeline)}")
    print(f"  Trends computed: {len(result.trends)}")
    print(f"  Critical flags: {len(result.critical_flags)}")
    print(f"  Total time: {elapsed:.2f}s")
    print(f"  Per image: {elapsed / len(images):.2f}s")


if __name__ == "__main__":
    asyncio.run(main())
