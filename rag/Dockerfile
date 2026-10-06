# =============================================================================
# ELITEBUILD RAG Microservice — Optimized CPU Container Image
# =============================================================================
# Platform Targets: Hugging Face Docker Space (Default), GCP Cloud Run, Railway
# Runtime Specs:
#   - Python 3.11-slim base
#   - CPU-only PyTorch (slashes ~2GB unneeded CUDA dependencies & reduces RAM)
#   - Pre-cached BAAI/bge-reranker-base & all-MiniLM-L6-v2 weights
#   - Single worker async Uvicorn (prevents duplicate model memory allocation)
#   - Hugging Face Spaces standard port 7860 (dynamically overridable via $PORT)
#   - Non-root user execution for container security
# =============================================================================

FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=7860 \
    HF_HOME=/app/cache/huggingface \
    SENTENCE_TRANSFORMERS_HOME=/app/cache/sentence_transformers \
    TORCH_HOME=/app/cache/torch

WORKDIR /app

# Install minimal runtime system dependencies (curl for healthcheck, libpq for PostgreSQL)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libpq5 \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Step 1: Install CPU-only PyTorch first (massive size & memory optimization)
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# Step 2: Install application requirements
COPY rag/requirements.txt /app/rag/requirements.txt
RUN pip install --no-cache-dir -r /app/rag/requirements.txt

# Remove build-only compiler tools to slim down final image layer
RUN apt-get purge -y --auto-remove gcc libpq-dev && rm -rf /var/lib/apt/lists/*

# Step 3: Pre-download and cache model weights into image layer
# 1. BAAI/bge-reranker-base (cross-encoder)
# 2. all-MiniLM-L6-v2 (local embeddings)
RUN python -c "from sentence_transformers import CrossEncoder, SentenceTransformer; \
    CrossEncoder('BAAI/bge-reranker-base'); \
    SentenceTransformer('all-MiniLM-L6-v2')" || \
    echo "Warning: Model pre-caching skipped during build; will download on first invocation."

# Copy RAG microservice application code
COPY rag/ /app/rag/

# Create non-root user and set permissions for cache directories
RUN useradd -m -u 1000 appuser && \
    mkdir -p /app/cache && \
    chown -R appuser:appuser /app

USER appuser

# Expose standard port (7860 for Hugging Face Spaces, overridable by cloud hosts)
EXPOSE 7860

# Liveness probe on /health/live
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
    CMD curl -f http://localhost:${PORT:-7860}/health/live || exit 1

# Production server: single-worker async to prevent duplicate model weights in RAM
CMD ["sh", "-c", "exec uvicorn rag.api.app:app --host 0.0.0.0 --port ${PORT:-7860} --workers 1"]
