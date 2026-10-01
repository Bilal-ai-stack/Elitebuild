# =============================================================================
# ELITEBUILD — Cloud Environment Configuration Matrix (Step 19)
# =============================================================================

This document defines the complete environment variable matrix for deploying the
ELITEBUILD platform across **Development**, **Preview (Vercel)**, and **Production (Vercel + Python Container)**.

Every variable is classified by:
- **Scope**: `PUBLIC` (browser-exposed) vs `SERVER_ONLY` (isolated in server runtimes)
- **Lifecycle**: `BUILD_TIME` vs `RUNTIME`
- **Requirement**: `REQUIRED` vs `OPTIONAL`
- **Sensitivity**: `SECRET` vs `CONFIG`

---

## 1. Next.js Frontend (Vercel Deployment)

| Variable Name | Scope | Lifecycle | Requirement | Sensitivity | Environments | Description / Value Guidance |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `DATABASE_URL` | `SERVER_ONLY` | `RUNTIME` | `REQUIRED` | `SECRET` | Dev, Preview, Prod | Managed PostgreSQL connection string with SSL (`sslmode=require`). For pooled serverless connections, use PgBouncer / Neon pooled port. |
| `AUTH_SECRET` | `SERVER_ONLY` | `RUNTIME` | `REQUIRED` | `SECRET` | Dev, Preview, Prod | High-entropy random key for JWT signing (`openssl rand -base64 32`). Must NEVER use default dev secret in production. |
| `NEXTAUTH_URL` | `SERVER_ONLY` | `RUNTIME` | `REQUIRED` | `CONFIG` | Dev, Preview, Prod | Canonical base URL (`https://elitebuild.vercel.app` or custom domain). |
| `NEXT_PUBLIC_APP_URL` | `PUBLIC` | `BUILD_TIME` | `REQUIRED` | `CONFIG` | Dev, Preview, Prod | Public canonical domain used for metadata, JSON-LD, sitemap, and OpenGraph. |
| `NEXT_PUBLIC_APP_NAME` | `PUBLIC` | `BUILD_TIME` | `REQUIRED` | `CONFIG` | Dev, Preview, Prod | Display title: `"M/S ELITE CONSTRUCTION COMPANY"`. |
| `RAG_SERVICE_URL` | `SERVER_ONLY` | `RUNTIME` | `REQUIRED` | `CONFIG` | Dev, Preview, Prod | Secure HTTPS URL of the FastAPI RAG microservice (e.g., `https://rag.elitebuild.com`). |
| `RAG_SERVICE_API_KEY` | `SERVER_ONLY` | `RUNTIME` | `REQUIRED` | `SECRET` | Dev, Preview, Prod | Shared internal authentication secret sent via `X-RAG-Service-Key` header. |
| `PRIVATE_STORAGE_ROOT` | `SERVER_ONLY` | `RUNTIME` | `OPTIONAL` | `CONFIG` | Dev only | Local document storage path. On Vercel, external persistent storage (S3/GCS/Supabase) is required. |
| `RATE_LIMIT_WINDOW_MS` | `SERVER_ONLY` | `RUNTIME` | `OPTIONAL` | `CONFIG` | Dev, Preview, Prod | Window in ms for in-memory / edge rate limiter (default: `60000`). |
| `RATE_LIMIT_MAX_REQUESTS` | `SERVER_ONLY` | `RUNTIME` | `OPTIONAL` | `CONFIG` | Dev, Preview, Prod | Maximum requests per IP per window (default: `30`). |

> [!CAUTION]
> **CRITICAL SECURITY INVARIANT:**
> Never prefix database credentials, auth secrets, RAG service keys, or LLM keys with `NEXT_PUBLIC_`.
> Any variable prefixed with `NEXT_PUBLIC_` is inlined into the client-side JavaScript bundle and publicly inspectable.

---

## 2. FastAPI RAG Microservice (Container / Cloud Host)

| Variable Name | Scope | Lifecycle | Requirement | Sensitivity | Environments | Description / Value Guidance |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `DATABASE_URL` | `SERVER_ONLY` | `RUNTIME` | `REQUIRED` | `SECRET` | Dev, Staging, Prod | Direct connection string to PostgreSQL with `pgvector` enabled. |
| `RAG_SERVICE_API_KEY` | `SERVER_ONLY` | `RUNTIME` | `REQUIRED` | `SECRET` | Dev, Staging, Prod | Shared secret required to authenticate requests from the Next.js API proxy. |
| `LLM_PROVIDER` | `SERVER_ONLY` | `RUNTIME` | `REQUIRED` | `CONFIG` | Dev, Staging, Prod | Target LLM provider: `"groq"`, `"openai"`, or `"mock"`. |
| `GROQ_API_KEY` | `SERVER_ONLY` | `RUNTIME` | `REQUIRED` (if Groq) | `SECRET` | Staging, Prod | Groq Cloud API authentication key (`gsk_...`). |
| `GROQ_MODEL` | `SERVER_ONLY` | `RUNTIME` | `OPTIONAL` | `CONFIG` | Dev, Staging, Prod | Groq model identifier (default: `llama-3.3-70b-versatile`). |
| `LLM_TEMPERATURE` | `SERVER_ONLY` | `RUNTIME` | `OPTIONAL` | `CONFIG` | Dev, Staging, Prod | Strict factual grounding temperature (default: `0.0`). |
| `LLM_MAX_OUTPUT_TOKENS` | `SERVER_ONLY` | `RUNTIME` | `OPTIONAL` | `CONFIG` | Dev, Staging, Prod | Maximum output token ceiling (default: `2000`). |
| `LLM_TIMEOUT_SECONDS` | `SERVER_ONLY` | `RUNTIME` | `OPTIONAL` | `CONFIG` | Dev, Staging, Prod | Provider timeout threshold (default: `30`). |
| `LLM_MAX_RETRIES` | `SERVER_ONLY` | `RUNTIME` | `OPTIONAL` | `CONFIG` | Dev, Staging, Prod | Maximum exponential-backoff retries for transient 5xx/network errors (default: `3`). |
| `EMBEDDING_PROVIDER` | `SERVER_ONLY` | `RUNTIME` | `REQUIRED` | `CONFIG` | Dev, Staging, Prod | Provider for vector search: `"openai"` or `"mock"`. |
| `EMBEDDING_MODEL` | `SERVER_ONLY` | `RUNTIME` | `OPTIONAL` | `CONFIG` | Dev, Staging, Prod | Embedding model name (default: `text-embedding-3-small`). |
| `VECTOR_DIMENSION` | `SERVER_ONLY` | `RUNTIME` | `OPTIONAL` | `CONFIG` | Dev, Staging, Prod | Embedding vector dimension (default: `1536`). |
| `RERANKER_PROVIDER` | `SERVER_ONLY` | `RUNTIME` | `REQUIRED` | `CONFIG` | Dev, Staging, Prod | Cross-encoder reranker: `"local"` or `"mock"`. |
| `RERANKER_MODEL` | `SERVER_ONLY` | `RUNTIME` | `OPTIONAL` | `CONFIG` | Dev, Staging, Prod | Model path / HuggingFace ID (default: `BAAI/bge-reranker-base`). |
| `CORS_ALLOWED_ORIGINS` | `SERVER_ONLY` | `RUNTIME` | `REQUIRED` | `CONFIG` | Dev, Staging, Prod | Comma-separated list of permitted Next.js origins (e.g., `https://elitebuild.vercel.app,https://eliteconstruction.pk`). |

---

## 3. Environment Breakdown: Dev vs Preview vs Production

### Development (`.env.local` / `.env`)
- `LLM_PROVIDER="mock"` or `"groq"`
- `EMBEDDING_PROVIDER="mock"`
- `RERANKER_PROVIDER="mock"`
- `DATABASE_URL="postgresql://user:password@localhost:5432/elitebuild"`
- `CORS_ALLOWED_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"`

### Vercel Preview (Pull Requests / Staging)
- `NEXT_PUBLIC_APP_URL="https://preview.elitebuild.com"` (or Vercel preview URL)
- `DATABASE_URL`: Staging database branch (isolated from production data)
- `RAG_SERVICE_URL`: Staging RAG microservice instance
- `CORS_ALLOWED_ORIGINS`: Comma-separated preview domain whitelist

### Production
- `NEXT_PUBLIC_APP_URL="https://eliteconstruction.pk"`
- `DATABASE_URL`: Primary managed PostgreSQL with replication and daily automated backups
- `AUTH_SECRET`: Cryptographically strong random 256-bit key
- `RAG_SERVICE_URL`: Production FastAPI cluster with SSL termination
- `CORS_ALLOWED_ORIGINS="https://eliteconstruction.pk,https://elitebuild.vercel.app"`
- `LLM_PROVIDER="groq"`
- `GROQ_API_KEY`: Dedicated production Groq Cloud API key with billing alerts
