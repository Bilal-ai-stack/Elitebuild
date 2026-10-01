# ELITEBUILD Enterprise RAG Service
## M/S ELITE CONSTRUCTION COMPANY — Engineers & Constructors
### High-Performance Hybrid Knowledge & Evidence Retrieval Service

This directory contains the complete RAG ingestion, vector storage, and hybrid retrieval pipeline for the ELITEBUILD enterprise construction knowledge system.

---

## Directory Structure

```
rag/
├── README.md                           # This file
├── requirements.txt                    # Python dependencies
├── __init__.py                         # Package root
├── __main__.py                         # python -m rag entry point
├── cli.py                              # Developer CLI commands
├── config/
│   └── settings.py                     # Environment configuration (Pydantic Settings)
├── schemas/
│   └── models.py                       # Data transfer models & metadata contracts
├── db/
│   ├── models.py                       # SQLAlchemy ORM models (rag_documents, rag_chunks + pgvector)
│   └── session.py                      # Database engine & session management
├── ingestion/
│   ├── pipeline.py                     # Ingestion orchestrator (idempotent)
│   ├── loaders/
│   │   └── database_loader.py          # Loads records from existing ELITEBUILD database
│   ├── chunking/
│   │   └── heading_chunker.py          # Heading-aware document chunking
│   ├── metadata/                       # Metadata enrichment (future)
│   └── parsers/                        # File parsers (future PDF/DOCX)
├── embeddings/
│   └── provider.py                     # Embedding provider interface (OpenAI + Mock)
├── retrieval/
│   └── engine.py                       # Hybrid retrieval engine (Dense + BM25 + RRF + Reranker)
├── api/
│   └── app.py                          # FastAPI endpoints (/retrieve, /ingest, /health, /status)
├── evaluation/
│   ├── dataset_schema.json             # JSON schema for benchmark test cases
│   └── gold_questions.template.json    # Gold QA benchmark seeds
├── observability/
│   └── logger.py                       # Structured JSON tracing & telemetry
└── tests/
    └── test_step11_rag.py              # Comprehensive Python test suite
```

---

## Quick Start

### 1. Install Python Dependencies
```bash
cd rag
pip install -r requirements.txt
```

### 2. Start PostgreSQL with pgvector
```bash
docker compose up -d   # Uses pgvector/pgvector:pg16 image
```

### 3. Initialize RAG Tables
```bash
python -m rag init
```

### 4. Ingest Database Sources
```bash
python -m rag ingest
```

### 5. Test Retrieval
```bash
python -m rag retrieve "What projects has Elite completed?"
```

### 6. Start RAG API Service
```bash
python -m rag serve
```

---

## Key Design Principles

1. **Zero Hallucination:** Strict enforcement of typed statuses (`SUPPORTED`, `PARTIALLY_SUPPORTED`, `CONFLICTING_EVIDENCE`, `INSUFFICIENT_EVIDENCE`).
2. **Pre-Retrieval Authorization:** Filter predicates (`tenant_id`, `security_access_level`) are injected directly into vector and BM25 queries before execution. Unauthorized chunks **never enter application memory**.
3. **Hybrid Precision:** Dense vector similarity combined with BM25 sparse matching, synthesized through Reciprocal Rank Fusion (k=60) and cross-encoder reranking.
4. **Traceable Citations:** All statements point to verified document IDs, sections, and versions.
5. **Idempotent Ingestion:** Content-hash-based deduplication prevents duplicate ingestion of unchanged data.
6. **No Data Fabrication:** The loader reads only from existing verified database records. No project names, values, dates, or claims are invented.

---

## LLM Providers (Answer Generation)

The RAG generation pipeline supports multiple pluggable LLM providers via `LLM_PROVIDER`:

| Provider | `LLM_PROVIDER` | Required Env Vars | Default Model | Notes |
|----------|----------------|-------------------|---------------|-------|
| **Mock** | `mock` | None | `mock-llm-v1` | Deterministic responses for dev/tests |
| **OpenAI** | `openai` | `OPENAI_API_KEY` | `gpt-4o-mini` | Chat Completions API |
| **Groq Cloud** | `groq` | `GROQ_API_KEY` | `llama-3.3-70b-versatile` | Ultra-fast inference with Llama 3 / Mixtral |

### Groq Cloud Configuration
- `LLM_PROVIDER="groq"`
- `GROQ_API_KEY="gsk_..."`
- `GROQ_MODEL="llama-3.3-70b-versatile"` (configurable: `llama-3.3-70b-versatile`, `llama-3.1-70b-versatile`, `llama-3.1-8b-instant`, `llama3-70b-8192`, `llama3-8b-8192`, `mixtral-8x7b-32768`, `gemma2-9b-it`)

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/rag/health` | None | Service health probe |
| `POST` | `/api/v1/rag/retrieve` | User context | Hybrid retrieval with authorization |
| `POST` | `/api/v1/rag/ingest` | Service key | Trigger ingestion pipeline |
| `GET` | `/api/v1/rag/status` | Service key | Ingestion status summary |

---

## Testing

### TypeScript Tests (existing Next.js test runner)
```bash
pnpm test
```

### Python Tests
```bash
cd rag && pytest tests/ -v
```
