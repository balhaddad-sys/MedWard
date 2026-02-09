"""FastAPI application — routes, dependencies, request limits."""

from __future__ import annotations

import logging
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

import labx
from labx.api.middleware import RequestIdMiddleware
from labx.api.schemas import AnalyseResponse, ErrorResponse, ExtractResponse, HealthResponse
from labx.config.settings import get_settings
from labx.pipeline.image_io import ImageValidationError
from labx.pipeline.orchestrator import run_extract_only, run_full_pipeline

logger = logging.getLogger(__name__)

app = FastAPI(
    title="labx — Lab Report Extraction Engine",
    version=labx.__version__,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── Middleware ────────────────────────────────────────────────────
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestIdMiddleware)


# ── Error handlers ───────────────────────────────────────────────
@app.exception_handler(ImageValidationError)
async def _image_validation_error(request, exc: ImageValidationError):  # type: ignore[no-untyped-def]
    return JSONResponse(
        status_code=422,
        content=ErrorResponse(error="image_validation", detail=str(exc)).model_dump(),
    )


@app.exception_handler(Exception)
async def _generic_error(request, exc: Exception):  # type: ignore[no-untyped-def]
    logger.exception("Unhandled error: %s", exc)
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(error="internal", detail=str(exc)).model_dump(),
    )


# ── Routes ───────────────────────────────────────────────────────


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", version=labx.__version__)


@app.post("/extract", response_model=ExtractResponse)
async def extract(
    files: list[UploadFile] = File(..., description="Lab report images (1-10)"),
) -> ExtractResponse:
    """Extract lab values from uploaded images (no trending/summary)."""
    settings = get_settings()
    paths = await _save_uploads(files, max_mb=settings.max_image_mb)
    try:
        reports = await run_extract_only(paths, settings=settings)
        return ExtractResponse(reports=reports, image_count=len(files))
    finally:
        _cleanup(paths)


@app.post("/analyse", response_model=AnalyseResponse)
async def analyse(
    files: list[UploadFile] = File(..., description="Lab report images (1-10)"),
    summary: bool = Query(default=True, description="Generate clinical summary"),
) -> AnalyseResponse:
    """Full pipeline: extract → normalize → merge → trend → summarize."""
    settings = get_settings()
    paths = await _save_uploads(files, max_mb=settings.max_image_mb)
    try:
        analysis = await run_full_pipeline(
            paths, settings=settings, enable_summary=summary
        )
        return AnalyseResponse(analysis=analysis)
    finally:
        _cleanup(paths)


# ── Helpers ──────────────────────────────────────────────────────


async def _save_uploads(files: list[UploadFile], *, max_mb: float) -> list[Path]:
    """Write uploaded files to a temp directory and return their paths."""
    tmpdir = Path(tempfile.mkdtemp(prefix="labx_"))
    paths: list[Path] = []
    for f in files:
        dest = tmpdir / (f.filename or "image.bin")
        content = await f.read()
        size_mb = len(content) / (1024 * 1024)
        if size_mb > max_mb:
            raise ImageValidationError(
                f"File {f.filename} is {size_mb:.1f} MB (limit {max_mb} MB)"
            )
        dest.write_bytes(content)
        paths.append(dest)
    return paths


def _cleanup(paths: list[Path]) -> None:
    """Remove temporary files."""
    for p in paths:
        try:
            p.unlink(missing_ok=True)
        except OSError:
            pass
    # Remove parent temp dir
    if paths:
        try:
            paths[0].parent.rmdir()
        except OSError:
            pass
