# syntax=docker/dockerfile:1

# ─── Stage 1: builder ─────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

# Install uv (fast Python package manager)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /build

# Copy dependency manifests only — maximises layer-cache reuse on source changes
COPY pyproject.toml requirements.txt ./

# Install all runtime deps into the system site-packages (no venv needed in container)
# --no-cache keeps the image lean; --system avoids the venv overhead
RUN uv pip install --system --no-cache -r requirements.txt

# ─── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

# Least-privilege: run as a non-root user
RUN useradd --create-home --shell /bin/sh app

# Grab only the installed packages from the builder stage
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin/uvicorn /usr/local/bin/uvicorn

# Copy application source tree
WORKDIR /app
COPY api/ ./api/
COPY scoutedge_intelligence/ ./scoutedge_intelligence/
# Pre-fitted Dixon-Coles params (params_*.json); .dockerignore allows just
# these files through. Loaded at startup by api/deps.py warm-up.
COPY artifacts/ ./artifacts/

# curl is needed for the HEALTHCHECK instruction
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

USER app

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/healthz || exit 1

# create_app is the application factory; uvicorn calls it via --factory
CMD ["uvicorn", "api.main:create_app", "--factory", \
     "--host", "0.0.0.0", "--port", "8080", \
     "--workers", "1", \
     "--log-level", "info"]
