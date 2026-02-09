# labx — Lab Report Extraction & Analysis Engine

Hospital-grade, async, vision-powered lab report extraction engine built on Claude Vision API.

## Quick Start

```bash
# Install
pip install -e ".[dev]"

# CLI: extract lab values from images
labx extract report1.jpg report2.png -o results.json

# CLI: full analysis with trending and summary
labx analyse report1.jpg report2.png -o analysis.json

# API server
uvicorn labx.api.server:app --reload
```

## Architecture

- **domain/** — Pure Pydantic models, flag computation, trend engine, severity scoring
- **providers/** — Anthropic Vision/Text adapters (swappable)
- **pipeline/** — Image I/O, concurrency, post-processing, merge, orchestration
- **api/** — FastAPI server
- **cli/** — Typer CLI

## Testing

```bash
pytest tests/ -v
```
