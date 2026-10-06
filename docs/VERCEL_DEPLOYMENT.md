# =============================================================================
# ELITEBUILD — Vercel Deployment & Cloud Architecture Guide (Step 19)
# =============================================================================

This document specifies the deployment architecture and execution procedures for deploying
the ELITEBUILD enterprise portal to **Vercel** and connecting it to the production cloud ecosystem.

---

## 1. System Deployment Architecture

The ELITEBUILD platform uses a decoupled, hybrid-cloud production architecture:

```text
                        ┌───────────────────────────────────────────────┐
                        │             Vercel Edge Network               │
                        │                                               │
                        │   ┌───────────────────────────────────────┐   │
                        │   │     Next.js 16 Web Application        │   │
                        │   │  (SSR, React 19, Static Pages, Proxy) │   │
                        │   └───────────────────┬───────────────────┘   │
                        └───────────────────────┼───────────────────────┘
                                                │
                          HTTPS (Encrypted JSON)│ Authenticated
                          Session Token Header  │ Server-to-Server Proxy
                                                ▼
                        ┌───────────────────────────────────────────────┐
                        │       Containerized Cloud Host                │
                        │   (AWS ECS / Railway / GCP Cloud Run)         │
                        │                                               │
                        │   ┌───────────────────────────────────────┐   │
                        │   │      FastAPI RAG Microservice         │   │
                        │   │ (Hybrid Retrieval, BM25, Reranker,    │   │
                        │   │  Observability, Ingestion Daemon)     │   │
                        │   └───────────────┬──────────────┬────────┘   │
                        └───────────────────┼──────────────┼────────────┘
                                            │              │
                   Direct SQL + pgvector    │              │ HTTPS REST API
                   Connection Pool          │              │ (gsk_... key)
                                            ▼              ▼
                        ┌───────────────────────┐   ┌───────────────────┐
                        │ Managed PostgreSQL    │   │ Groq Cloud API    │
                        │ (Neon / Supabase /    │   │ (Llama 3.3 70B    │
                        │  AWS RDS + pgvector)  │   │  Versatile)       │
                        └───────────────────────┘   └───────────────────┘
```

---

## 2. Component Hosting Allocation Rationale

### What Runs on Vercel
- **Next.js 16 (Turbopack)**: Public pages, corporate profiles, service portfolios, credentials, equipment registries, contact forms, admin dashboards, and authenticated session management.
- **Static Assets & SSR**: Automatic edge caching, fast global CDN delivery, responsive image optimization.
- **API Proxy Routes (`/api/rag/query`, `/api/auth/*`)**: Lightweight serverless functions that validate incoming user sessions, enforce role restrictions, and securely proxy requests to upstream cloud services.

### Why FastAPI & RAG Microservice Do NOT Run on Vercel Serverless
1. **Machine Learning Model Footprint**:
   - The cross-encoder reranker (`BAAI/bge-reranker-base`) and sentence-transformers require PyTorch, CUDA/CPU tensor libraries, and tokenizers totaling >1.5 GB in dependencies and weights.
   - Vercel serverless functions have a maximum uncompressed bundle limit of 250 MB.
2. **Execution Latency & Timeouts**:
   - Heavy document ingestion and re-indexing operations take minutes to hours. Vercel serverless execution limits (10s to 60s) would terminate ingestion jobs prematurely.
3. **Persistent In-Memory Indices & Daemons**:
   - The BM25 lexical index, quality gate baselines, and tracer ring buffers require continuous process memory rather than ephemeral, stateless cold-starting lambdas.
4. **Architecture Decision**:
   - **Next.js → Vercel**
   - **FastAPI RAG Service → Python Container Host (Docker / Cloud Run / ECS / Railway)**

---

## 3. Storage Cloud Readiness: PERSISTENT STORAGE REQUIRED

> [!WARNING]
> **STORAGE CLOUD READINESS FINDING: PERSISTENT STORAGE REQUIRED**
>
> The local development environment writes documents to `./storage/documents` and media to `./public/uploads`.
> On Vercel, the local container filesystem is read-only and ephemeral; any files written to local disk are discarded when serverless instances recycle.
>
> **Production Requirement & Resolution:**
> For production deployment where admins upload company documents or images, an external cloud blob storage provider is required.
> **Resolved & Implemented:** Native zero-dependency AWS S3 / Cloudflare R2 storage driver is implemented in `lib/storage/s3.ts` and integrated in `lib/storage/index.ts`. Set `STORAGE_PROVIDER="s3"` along with `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, and `STORAGE_ENDPOINT` to enable. Cloudflare R2 bucket integration has been verified live.

---

## 4. Pre-Deployment Verification Checklist

Before deploying the Next.js app to Vercel:

- [x] TypeScript compiler passes without errors: `npx tsc --noEmit`
- [x] Full test suite passes: `pnpm test` (122 / 122 tests passing)
- [x] Python test suite passes: `python -m pytest` (149 / 149 tests passing)
- [x] Production build passes cleanly: `pnpm run build` (All 42 routes compiled)
- [x] No credentials or secrets committed to Git (`git status`, `.gitignore` strictly isolates `.env*`)
- [x] Zero secrets exposed via `NEXT_PUBLIC_` variables
- [x] `AUTH_SECRET` enforces strict fatal error in production if unconfigured

---

## 5. Vercel Deployment Step-by-Step

### Step 5.1 — Configure Environment Variables in Vercel Project Settings
In the Vercel Dashboard (`Settings -> Environment Variables`), add:

```env
DATABASE_URL=postgresql://<user>:<password>@<db-host>:5432/<dbname>?sslmode=require
AUTH_SECRET=<generate-via-openssl-rand-base64-32>
NEXTAUTH_URL=https://elitebuild.vercel.app
NEXT_PUBLIC_APP_URL=https://eliteconstruction.pk
NEXT_PUBLIC_APP_NAME="M/S ELITE CONSTRUCTION COMPANY"
RAG_MODE=trial
CLOUDFLARE_ACCOUNT_ID=<cloudflare-account-id>
CLOUDFLARE_AI_API_TOKEN=<cloudflare-workers-ai-token>
GROQ_API_KEY=<groq-api-key>
RAG_SERVICE_URL=https://<your-rag-fastapi-service-host>
RAG_SERVICE_API_KEY=<shared-secret-key>
```

### Step 5.2 — Deploy via Git or Vercel CLI
```bash
# Option A: Push to GitHub repository connected to Vercel
git push origin main

# Option B: Deploy using Vercel CLI
vercel --prod
```

### Step 5.3 — Post-Deployment Smoke Verification
1. Access the deployed root URL (`https://elitebuild.vercel.app`).
2. Verify SSL certificate, security headers, and HTTP -> HTTPS redirect.
3. Test public navigation: Home, About, Services, Projects, Credentials, Equipment, Contact.
4. Attempt admin login at `/admin/login`.
5. Trigger a knowledge search query from the public header to verify the authenticated `/api/rag/query` proxy.
