FROM python:3.11-slim AS base

WORKDIR /app

# System deps
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY pyproject.toml ./
RUN pip install --no-cache-dir . 2>/dev/null || true

# Copy source
COPY . .
RUN pip install --no-cache-dir .

# Non-root user
RUN useradd -m labx
USER labx

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "labx.api.server:app", "--host", "0.0.0.0", "--port", "8000"]
