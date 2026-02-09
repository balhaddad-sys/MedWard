"""Typer CLI — extract / analyse / benchmark."""

from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Annotated, Optional

import typer

from labx.cli.formatters import (
    format_analysis_summary,
    format_reports_summary,
    write_json,
)
from labx.observability.logging import setup_logging

app = typer.Typer(
    name="labx",
    help="Lab Report Extraction & Analysis Engine",
    no_args_is_help=True,
)


@app.command()
def extract(
    files: Annotated[
        list[Path],
        typer.Argument(help="Lab report image files", exists=True),
    ],
    output: Annotated[
        Optional[Path],
        typer.Option("-o", "--output", help="Output JSON file (default: stdout)"),
    ] = None,
    verbose: Annotated[
        bool,
        typer.Option("-v", "--verbose", help="Enable debug logging"),
    ] = False,
) -> None:
    """Extract lab values from report images."""
    setup_logging(level="DEBUG" if verbose else "INFO")

    from labx.pipeline.orchestrator import run_extract_only

    reports = asyncio.run(run_extract_only(files))

    typer.echo(format_reports_summary(reports))

    data = [r.model_dump(mode="json") for r in reports]
    write_json(data, output)

    if output:
        typer.echo(f"\nResults written to {output}")


@app.command()
def analyse(
    files: Annotated[
        list[Path],
        typer.Argument(help="Lab report image files or directories", exists=True),
    ],
    output: Annotated[
        Optional[Path],
        typer.Option("-o", "--output", help="Output JSON file (default: stdout)"),
    ] = None,
    summary: Annotated[
        bool,
        typer.Option("--summary/--no-summary", help="Generate clinical summary"),
    ] = True,
    verbose: Annotated[
        bool,
        typer.Option("-v", "--verbose", help="Enable debug logging"),
    ] = False,
) -> None:
    """Full analysis: extract → normalize → merge → trend → summarize."""
    setup_logging(level="DEBUG" if verbose else "INFO")

    # Expand directories to image files
    expanded = _expand_paths(files)
    if not expanded:
        typer.echo("No image files found.", err=True)
        raise typer.Exit(1)

    from labx.pipeline.orchestrator import run_full_pipeline

    analysis = asyncio.run(run_full_pipeline(expanded, enable_summary=summary))

    typer.echo(format_analysis_summary(analysis))

    if output:
        write_json(analysis.model_dump(mode="json"), output)
        typer.echo(f"\nResults written to {output}")


def _expand_paths(paths: list[Path]) -> list[Path]:
    """Expand directories into image files."""
    image_exts = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
    result: list[Path] = []
    for p in paths:
        if p.is_dir():
            for f in sorted(p.iterdir()):
                if f.suffix.lower() in image_exts:
                    result.append(f)
        else:
            result.append(p)
    return result


if __name__ == "__main__":
    app()
