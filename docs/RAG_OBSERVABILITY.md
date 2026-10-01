# ELITEBUILD RAG — Observability, Telemetry, Tracing & Quality Monitoring
## M/S ELITE CONSTRUCTION COMPANY — Engineers & Constructors
### Step 14 Production Specification & Architecture

---

## 1. Overview & Objectives

Step 14 introduces comprehensive, privacy-preserving, production-grade **Observability, Distributed Tracing, Telemetry, and Quality Monitoring** for the ELITEBUILD RAG system.

The core objective is to make every RAG interaction **observable, diagnosable, auditable, and measurable in operation**, answering with zero fabrication:
1. *What happened during this request?*
2. *Why was this specific evidence retrieved?*
3. *What individual scores did Dense, BM25, RRF, and Reranking produce?*
4. *What evidence status was assigned and why?*
5. *Which provider/model generated the answer, and how many tokens were consumed?*
6. *How long did each pipeline stage take (p50 / p95)?*
7. *Which citations were returned and were they mathematically traceable?*
8. *Did an error or security violation occur, and can it be traced without leaking credentials?*

---

## 2. Distributed Tracing Architecture

Every RAG query creates an isolated root trace (`RAGTrace`) with a globally unique `trace_id` and `request_id`, correlating parent-child spans across all pipeline stages:

```
                    RAG REQUEST
                         │
                         ▼
                   TRACE START (trace_id, request_id)
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
     rag.auth       rag.security    rag.query
          │
    ┌─────┼─────┐
    ▼     ▼     ▼
  Dense  BM25   RRF
    │     │     │
    └─────┼─────┘
          ▼
     rag.rerank
          │
          ▼
     rag.evidence
          │
          ▼
     rag.generation
          │
          ▼
     rag.citations
          │
          ▼
     Final Response
          │
          ▼
      TRACE END (finish status, total_latency_ms)
```

### Trace Identifiers & Correlation
- `trace_id`: Unique identifier format `trace-[32 hex chars]`.
- `request_id`: Request correlation ID format `req-[12 hex chars]`.
- `span_id`: Child span identifier format `[16 hex chars]`.
- `parent_span_id`: Pointer to parent span or root span.
- `evaluation_run_id`: Links evaluation benchmark test cases directly to individual execution traces.
- `test_case_id`: Links benchmark test case identifier (e.g., `TC-CORP-001`) to the trace.

---

## 3. Structured JSON Logging & Event Standards

All telemetry events emit machine-readable, single-line JSON log entries via `StructuredJsonFormatter`:

```json
{
  "timestamp": "2026-10-01T07:42:26.856463+00:00",
  "level": "INFO",
  "logger": "elitebuild.rag.query",
  "message": "RAG query req-a1b2c3d4e5f6 completed in 85.4ms",
  "telemetry": {
    "trace_id": "trace-5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d",
    "request_id": "req-a1b2c3d4e5f6",
    "event_type": "rag.request.completed",
    "tenant_id": "elitebuild-core",
    "user_role": "PUBLIC",
    "latency_ms": {
      "retrieval": 22.4,
      "generation": 58.2,
      "citation_validation": 4.8,
      "total": 85.4
    },
    "tokens": {
      "input": 320,
      "output": 85,
      "total": 405
    },
    "cost_usd": 0.000105,
    "cost_state": "MEASURED",
    "evidence_status": "SUPPORTED"
  }
}
```

### Supported Lifecycle Event Types
- `rag.request.started`
- `rag.authorization.completed`
- `rag.retrieval.started`
- `rag.dense.completed`
- `rag.bm25.completed`
- `rag.rrf.completed`
- `rag.reranker.completed`
- `rag.evidence.assessed`
- `rag.generation.started`
- `rag.generation.completed`
- `rag.citation.validation.completed`
- `rag.request.completed`
- `rag.request.failed`
- `rag.ingestion.started` / `completed` / `failed`
- `rag.evaluation.run.started` / `case.completed` / `run.completed`

---

## 4. Privacy, Credential Scrubbing & Tenant Isolation

### 4.1 Zero Secret Exposure
`rag/observability/sanitizer.py` enforces regex scrubbing before any string, dictionary, or error log is written to stdout, disk, or memory:
- **OpenAI Keys:** `sk-[a-zA-Z0-9_-]{20,}` -> `[REDACTED_SECRET]`
- **Groq Keys:** `gsk_[a-zA-Z0-9_-]{20,}` -> `[REDACTED_SECRET]`
- **Anthropic Keys:** `sk-ant-[a-zA-Z0-9_-]{20,}` -> `[REDACTED_SECRET]`
- **Bearer Tokens & JWTs:** `Bearer ...` / `eyJ...` -> `[REDACTED_SECRET]`
- **Database Connection URIs:** `postgresql://user:pass@host` -> `postgresql://user:[REDACTED]@host`
- **Sensitive Dict Keys:** Recursively scrubs keys containing `password`, `jwt_secret`, `api_key`, `access_token`, etc.

### 4.2 Query & User Privacy
- **User Identifiers:** Salted SHA-256 masking (`mask_identifier(user_id)`) converts user identifiers to anonymized hashes like `anon-648fd43e90cd`.
- **Query Text:** Truncated to a 120-character preview with secret scrubbing; stored as SHA-256 hash (`query_hash`) for deduplication and privacy audits.
- **Document Content:** Telemetry records only `document_id`, `chunk_id`, scores, and authority metadata—never full raw chunk text.

### 4.3 Tenant Isolation
Telemetry records tenant IDs strictly as isolated partitions. Aggregated metrics and trace listings enforce filtering by `tenant_id` to prevent cross-tenant data leaks.

---

## 5. Telemetry Metrics & Truthfulness Contract

Every metric reports an explicit truthfulness state:
- `MEASURED`: The value was calculated directly from provider API response headers or execution timers (e.g., latency, token usage from OpenAI/Groq).
- `ESTIMATED`: Calculated using character heuristics when provider token headers are unavailable (e.g. 4 chars per token).
- `NOT_AVAILABLE`: Missing provider information or unconfigured pricing.
- `NOT_IMPLEMENTED`: Features not currently active (e.g., semantic response cache).

### Pricing Catalog (`MODEL_PRICING`)
Transparent pricing table in `rag/observability/cost.py`:
- `gpt-4o-mini`: $0.15/1M input, $0.60/1M output
- `gpt-4o`: $2.50/1M input, $10.00/1M output
- `llama-3.3-70b-versatile` (Groq): $0.59/1M input, $0.79/1M output
- `llama-3.1-8b-instant` (Groq): $0.05/1M input, $0.08/1M output

---

## 6. Percentiles & TraceStore In-Memory Ring Buffer

To prevent table bloat and locking overhead on the primary PostgreSQL database, traces are stored in an in-memory, thread-safe ring buffer (`TraceStore`, default capacity: 1,000 items).

### Distribution Math
- **p50 Latency:** 50th percentile total, retrieval, and generation latencies.
- **p95 Latency:** 95th percentile total, retrieval, and generation latencies.
- **Small Sample Guard:** When sample count is `< 5`, the percentile calculator explicitly returns `"INSUFFICIENT_SAMPLE"` instead of manufacturing misleading numbers.

---

## 7. Component Health Probes & Degraded Mode

`check_rag_health()` verifies subsystem health non-destructively:

| Component | Healthy Condition | Degraded / Unavailable Condition |
|---|---|---|
| **Database** | Connected via SQLAlchemy pool | Disconnected / connection error |
| **Vector Store** | `pg_extension` has `vector` | pgvector extension missing |
| **BM25 Search** | `to_tsvector` query succeeds | Full text tsvector error |
| **Embedding Provider** | Configured model available | Missing provider credentials |
| **Reranker** | Cross-encoder model loaded | sentence-transformers uninstalled (Fallback to RRF active) |
| **LLM Provider** | Configured provider & model | API provider unavailable |

The service returns `HEALTHY` only when all required components are available, `DEGRADED` when optional dependencies (e.g., cross-encoder reranker) fallback gracefully, and `UNAVAILABLE` if primary database is down.

---

## 8. Quality Regression Detection (`QualityRegressionDetector`)

Compares candidate benchmark evaluation runs against a baseline run using configurable thresholds:
- **Recall@K Tolerance:** Warning if Recall drops by $\ge 0.05$.
- **MRR Tolerance:** Warning if MRR drops by $\ge 0.05$.
- **Faithfulness Tolerance:** Warning if Faithfulness drops by $\ge 0.05$.
- **Hallucination Tolerance:** Critical alert if Hallucination rate increases by $\ge 0.05$.
- **Latency Ratio:** Warning if p95 latency jumps by $> 50\%$.

CLI command:
```bash
python -m rag.cli compare --baseline eval_results/baseline.json --candidate eval_results/candidate.json
```

---

## 9. Developer CLI Commands

```bash
# Display aggregated telemetry metrics (volume, p50, p95, tokens, costs)
python -m rag.cli metrics

# Inspect a specific trace by ID
python -m rag.cli trace trace-1234567890abcdef

# Check component health status
python -m rag.cli health

# Compare two evaluation runs to detect regressions
python -m rag.cli compare --baseline run_a.json --candidate run_b.json
```

---

## 10. Verification & Test Suite Summary

- **TypeScript Tests:** `npm test` runs 101 tests across 11 suites including `tests/step14-rag-observability.test.ts`. All 101 tests pass.
- **Python Tests:** `python -m pytest rag/tests/` runs 106 tests including `rag/tests/test_step14_observability.py`. All 106 tests pass.
- **TypeScript Static Verification:** `npx tsc --noEmit` exits with code 0.
- **Production Next.js Build:** `npm run build` succeeds in Turbopack mode, prerendering all 39 static routes.
- **Database Safety:** Zero Prisma migrations executed, zero schema alterations, zero data loss.
