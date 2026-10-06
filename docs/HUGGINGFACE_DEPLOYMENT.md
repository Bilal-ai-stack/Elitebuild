# =============================================================================
# ELITEBUILD — Hugging Face Docker Space Deployment Guide
# =============================================================================

This document specifies the step-by-step procedure for deploying the ELITEBUILD FastAPI RAG microservice to a **Hugging Face Docker Space** at zero infrastructure cost.

---

## 1. Why Hugging Face Spaces for ELITEBUILD RAG?

| Feature | Hugging Face Free Tier | Railway / Render Free Tiers |
| :--- | :--- | :--- |
| **RAM Allocation** | **16 GB RAM** (Ample for PyTorch + BGE Reranker) | 512 MB (Crashes with OOM on PyTorch) |
| **vCPU Allocation** | **2 vCPUs** | 0.5–1 shared vCPU |
| **Cost** | **$0 / month** (Permanently Free) | Paid subscription required after 30 days |
| **Container Engine** | Native Docker Space (runs `rag/Dockerfile`) | Proprietary buildpacks or paid upgrades |
| **Public Endpoint** | Instant HTTPS URL (`https://<user>-<space>.hf.space`) | Custom setup |

---

## 2. Space Configuration Metadata

When creating a repository on Hugging Face Spaces, add the following YAML metadata block to the Space's `README.md`:

```yaml
---
title: Elitebuild RAG
emoji: 🏗️
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
---
```

---

## 3. Deployment Steps

### Step 3.1 — Create Hugging Face Space
1. Log in to [Hugging Face](https://huggingface.co).
2. Click **New Space** -> [huggingface.co/new-space](https://huggingface.co/new-space).
3. Set **Space Name**: e.g., `elitebuild-rag`.
4. License: `mit` or `apache-2.0`.
5. Select Space SDK: **Docker** -> **Blank**.
6. Space Hardware: **CPU Basic · 2 vCPU · 16 GB RAM · Free**.
7. Privacy: **Public** (or **Private** with Hugging Face read token).

### Step 3.2 — Push RAG Microservice Files to the Space
Clone your Space repository and copy the `rag/` folder and `Dockerfile`:
```bash
git clone https://huggingface.co/spaces/<your-username>/elitebuild-rag
cd elitebuild-rag

# Copy required files:
# - Dockerfile (from rag/Dockerfile, placed at repository root of the Space)
# - requirements.txt (placed at rag/requirements.txt)
# - entire rag/ codebase
```
Commit and push:
```bash
git add .
git commit -m "feat: deploy ELITEBUILD RAG microservice with CPU PyTorch and local embeddings"
git push
```

### Step 3.3 — Configure Environment Variables & Secrets in Space Settings
In your Hugging Face Space, navigate to **Settings** -> **Variables and secrets**:

#### Add Secrets (Encrypted):
- `DATABASE_URL`: Your managed Neon PostgreSQL connection string (`postgresql://...sslmode=require`).
- `RAG_SERVICE_API_KEY`: High-entropy shared secret (e.g. `openssl rand -hex 32`).
- `GROQ_API_KEY`: Your Groq Cloud API key (`gsk_...`).

#### Add Variables (Configuration):
- `LLM_PROVIDER`: `groq`
- `GROQ_MODEL`: `llama-3.3-70b-versatile`
- `EMBEDDING_PROVIDER`: `local`
- `EMBEDDING_MODEL`: `all-MiniLM-L6-v2`
- `VECTOR_DIMENSION`: `384`
- `RERANKER_PROVIDER`: `local`
- `RERANKER_MODEL`: `BAAI/bge-reranker-base`
- `CORS_ALLOWED_ORIGINS`: `https://elitebuild.vercel.app` (your Vercel deployment domain)
- `RAG_TENANT_ID`: `elitebuild-core`
- `PORT`: `7860`

---

## 4. Verification

Once Hugging Face builds and starts the container (approx. 2–3 minutes):
1. Test Liveness Probe:
   ```bash
   curl -f https://<your-username>-elitebuild-rag.hf.space/health/live
   # Expected response: {"status":"ALIVE", ...}
   ```
2. Test Subsystem Readiness:
   ```bash
   curl -f https://<your-username>-elitebuild-rag.hf.space/health
   # Expected: {"status":"HEALTHY", ...}
   ```
3. Test Authenticated Query:
   ```bash
   curl -X POST https://<your-username>-elitebuild-rag.hf.space/query \
     -H "Content-Type: application/json" \
     -H "X-RAG-Service-Key: <your-RAG_SERVICE_API_KEY>" \
     -H "X-User-Role: PUBLIC" \
     -d '{"query": "Who is the CEO of Elite Construction Company?"}'
   ```

---

## 5. Connecting Next.js on Vercel to Hugging Face RAG

In your **Vercel Project Settings** -> **Environment Variables**:
- `RAG_SERVICE_URL`: `https://<your-username>-elitebuild-rag.hf.space`
- `RAG_SERVICE_API_KEY`: `<same shared secret>`
