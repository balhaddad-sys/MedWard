#!/usr/bin/env bash
# Start the labx development server with auto-reload.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "Starting labx dev server on http://localhost:8000"
echo "Docs: http://localhost:8000/docs"

uvicorn labx.api.server:app \
  --host 0.0.0.0 \
  --port 8000 \
  --reload \
  --reload-dir labx \
  --log-level info
