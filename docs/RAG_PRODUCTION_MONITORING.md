# ELITEBUILD RAG — Production Monitoring, Quality Gates & Operational Readiness (Step 15)

**M/S ELITE CONSTRUCTION COMPANY — Engineers & Constructors**

Document Version: 1.0.0  
Status: IMPLEMENTED & VERIFIED  
Target Environment: Production / Staging / Development

---

## 1. Executive Summary

Step 15 transitions the ELITEBUILD RAG system from observational instrumentation (established in Step 14) into an **active operational quality governance and monitoring layer**.

This operational layer answers the core production question:
> **"Is the ELITEBUILD RAG system healthy, secure, performant, and producing acceptable evidence-grounded answers?"**

Key operational capabilities:
1. **12-Subsystem RAG Health Model** (`api`, `database`, `pgvector`, `embedding_provider`, `bm25`, `rrf`, `reranker`, `llm`, `citation_validation`, `ingestion`, `evaluation`, `telemetry`).
2. **Deterministic Quality Gates** across Retrieval, Generation, Citation, Security, Performance, and Reliability.
3. **Zero Fabrication Policy**: Missing benchmark data or telemetry samples strictly produce `NOT_EVALUATED` rather than synthetic passes or zeroes.
4. **Evaluation → Production Linkage**: Automatically discovers and links actual benchmark runs from Step 13 (`rag/evaluation/results/eval_run_*.json`).
5. **Quality Regression Detection**: Detects statistically meaningful regressions across benchmark runs with typed states (`IMPROVED`, `STABLE`, `REGRESSED`, `NOT_COMPARABLE`, `INSUFFICIENT_DATA`).
6. **Ingestion & Freshness Monitoring**: Tracks document inventory, chunk embeddings, SHA-256 deduplication, and stale knowledge detection (`CURRENT`, `STALE`, `UNKNOWN`).
7. **Graceful Degraded Mode Handling**: Handles reranker fallback to RRF, BM25 fallback, or database disconnect with explicit telemetry and request flags.
8. **Operational Alerting & Security Feed**: Thread-safe in-memory alert engine classifying incidents (`INFO`, `WARNING`, `CRITICAL`) with sanitized audit trails.
9. **Machine-Readable Operational Status Report**: Accessible via CLI (`python -m rag.cli report`) and REST endpoint (`GET /api/v1/rag/operational-report`).
10. **Protected Admin Monitoring Dashboard**: Accessible at `/admin/rag-monitoring` for `SUPER_ADMIN` and `ADMIN` users within the existing admin experience.

---

## 2. 12-Subsystem RAG Health Model

The system defines non-destructive probes for each subsystem with strictly typed statuses:
`HEALTHY` | `DEGRADED` | `UNAVAILABLE` | `NOT_CONFIGURED` | `UNKNOWN`

```text
ELITEBUILD RAG Health Model
├── api                   : Process status, HTTP engine, uptime, semantic version
├── database              : PostgreSQL pool connectivity, query responsiveness
├── pgvector              : pgvector extension status, HNSW index table presence
├── embedding_provider    : Embedding model initialized, vector dimension verified
├── bm25                  : PostgreSQL tsvector full-text search capability
├── rrf                   : In-memory Reciprocal Rank Fusion algorithm
├── reranker              : Cross-encoder model availability or RRF fallback mode
├── llm                   : Cloud/local LLM provider configuration and reachability
├── citation_validation   : Provenance link checker & bracket reference validator
├── ingestion             : Ingestion pipeline state, document count, chunk count
├── evaluation            : Step 13 benchmark runs discovered, latest run status
└── telemetry             : TraceStore, distributed span collector, metric state
```

### Health Endpoints

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/health` | GET | Public | 12-subsystem structured health check |
| `/health/live` | GET | Public | Fast process liveness probe (returns HTTP 200 `ALIVE`) |
| `/health/ready` | GET | Public | Dependency readiness probe (returns HTTP 200 or HTTP 503) |
| `/rag/health` | GET | Public | RAG subsystem health check |
| `/api/v1/rag/health` | GET | Public | Primary API health endpoint |
| `/api/v1/rag/health/live` | GET | Public | Liveness probe alias |
| `/api/v1/rag/health/ready` | GET | Public | Readiness probe alias |

---

## 3. Configurable Quality Gates Framework

Quality gates evaluate whether the RAG system satisfies production standards before deployment or during ongoing operation.

### Configured Thresholds

| Category | Rule Name | Metric | Prod Threshold | Dev Profile | Operator |
|---|---|---|---|---|---|
| **Retrieval** | `recall_at_5` | Recall@5 | $\ge 0.80$ | $\ge 0.70$ | $>=$ |
| **Retrieval** | `precision_at_1` | Precision@1 | $\ge 0.60$ | $\ge 0.50$ | $>=$ |
| **Retrieval** | `mrr` | MRR | $\ge 0.70$ | $\ge 0.60$ | $>=$ |
| **Retrieval** | `ndcg_at_5` | NDCG@5 | $\ge 1.00$ | $\ge 1.00$ | $>=$ |
| **Generation** | `faithfulness` | Groundedness | $\ge 0.70$ | $\ge 0.20$ | $>=$ |
| **Generation** | `correctness` | Correctness F1 | $\ge 0.60$ | $\ge 0.05$ | $>=$ |
| **Generation** | `hallucination_rate` | Hallucination | $\le 0.15$ | $\le 0.90$ | $<=$ |
| **Citation** | `citation_traceability` | Chunk Resolution | $\ge 0.95$ | $\ge 0.95$ | $>=$ |
| **Citation** | `citation_completeness` | Claim Coverage | $\ge 0.90$ | $\ge 0.90$ | $>=$ |
| **Citation** | `citation_fabrication` | Fabricated Citations | $\le 0.00$ | $\le 0.00$ | $<=$ |
| **Security** | `tenant_isolation` | Cross-tenant leaks | $\le 0$ | $\le 0$ | $<=$ |
| **Security** | `rbac_enforcement` | Clearance failures | $\le 0$ | $\le 0$ | $<=$ |
| **Security** | `prompt_injection` | Boundary bypasses | $\le 0$ | $\le 0$ | $<=$ |
| **Performance**| `p50_latency` | Median latency | $\le 50\text{ ms}$ | $\le 150\text{ ms}$ | $<=$ |
| **Performance**| `p95_latency` | p95 latency | $\le 200\text{ ms}$ | $\le 500\text{ ms}$ | $<=$ |
| **Reliability**| `request_failure_rate`| Failure rate | $\le 0.05$ | $\le 0.05$ | $<=$ |

### Gate Statuses
- `PASSED`: Measured value satisfies or exceeds threshold.
- `FAILED`: Measured value breaches threshold.
- `NOT_EVALUATED`: Benchmark or telemetry metric unavailable. Never fabricated.
- `INSUFFICIENT_DATA`: Partial data insufficient to compute threshold.

---

## 4. Evaluation-to-Production Quality Linkage

The system automatically discovers the most recent evaluation run in `rag/evaluation/results/` and links:
- `evaluation_run_id`: Timestamp identifier of the benchmark execution.
- `benchmark_version`: SemVer tag of the gold test set.
- `total_cases`: Evaluated test case count.
- `retrieval_configuration`: Parameters (`dense_top_k`, `sparse_top_k`, `rrf_k`, `final_top_k`).
- `embedding_model`, `reranker_model`, `generation_model`.
- Measured metric values across retrieval, generation, citation, performance, and security.

---

## 5. Quality Regression Detection

Compares baseline vs candidate benchmark runs and classifies quality trajectory:
- `IMPROVED`: All metrics stable or improved, no regressions.
- `STABLE`: Negligible changes within configured tolerance ($\pm 5\%$).
- `REGRESSED`: One or more metrics degraded beyond tolerance:
  - Recall drops by $\ge 0.05$
  - Precision drops by $\ge 0.05$
  - MRR drops by $\ge 0.05$
  - Faithfulness drops by $\ge 0.05$
  - Hallucination rate increases by $\ge 0.05$
  - Citation traceability drops by $\ge 0.02$
  - p95 latency increases by $> 50\%$
- `NOT_COMPARABLE`: Incompatible benchmark datasets (major version mismatch).
- `INSUFFICIENT_DATA`: Fewer than 2 benchmark runs available.

---

## 6. Ingestion Health & Stale Knowledge Detection

Monitors the PostgreSQL `rag_documents` and `rag_chunks` tables for knowledge freshness:
- `CURRENT`: Document timestamp within authority validity window.
- `STALE`: Document age exceeds validity policy.
  - `VERIFIED_DOCUMENT` (PEC licenses, ISO certificates): 365 days.
  - `VERIFIED_PROJECT_RECORD` (Completion certificates): 730 days.
  - `VERIFIED_COMPANY_RECORD`: 365 days.
  - `ADMIN_AUTHORED_CONTENT`: 180 days.
- `UNKNOWN`: Missing timestamp or no freshness policy configured.

---

## 7. Degraded Mode & Request Operational Quality Status

Every RAG query response returns two distinct status concepts:
1. **Evidence Status (Authoritative from Step 12)**:
   `SUPPORTED` | `PARTIALLY_SUPPORTED` | `CONFLICTING_EVIDENCE` | `INSUFFICIENT_EVIDENCE`
2. **Operational Quality Status (Step 15)**:
   `HEALTHY` | `DEGRADED` | `INSUFFICIENT_EVIDENCE` | `CONFLICTING_EVIDENCE` | `FAILED`

### Fallback Behaviors
- **Cross-Encoder Reranker Unavailable**: Gracefully falls back to RRF rank fusion; flags `degraded_mode: true` with reason `"Cross-encoder model uninstalled; fallback to RRF active"`.
- **BM25 Unavailable**: Gracefully falls back to dense vector retrieval; flags `degraded_mode: true`.
- **Database Disconnected**: Fast controlled failure with HTTP 500 without crashing or hanging.
- **Telemetry Failure**: Logged safely, never blocks query processing or leaks credentials.

---

## 8. Security & Prompt Injection Monitoring

Security events are tracked and audited without logging secrets or private data:
- `UNAUTHORIZED_RETRIEVAL`: Attempt to access documents above role clearance.
- `TENANT_ISOLATION_VIOLATION`: Query directed across tenant partitions.
- `RBAC_DENIAL`: Attempt to use invalid or elevated role from untrusted clients.
- `PROMPT_INJECTION_DETECTED`: Heuristic signatures detected in query text.
- `INVALID_CITATION`: Citations failing provenance verification.

---

## 9. Next.js Admin Dashboard Integration

Located at `/admin/rag-monitoring` and added to the sidebar under **System**:
- Access restricted to `SUPER_ADMIN` and `ADMIN` via `canViewRagMonitoring()`.
- Renders:
  - Overall Service Status banner with uptime and environment.
  - 12-subsystem health grid.
  - Quality Gate policy table with rule-by-rule pass/fail badges.
  - Latency SLA distributions (p50/p95) and reliability error rates.
  - Knowledge base freshness audit (Current, Stale, Unknown).
  - Active operational alerts feed.
  - Single-click JSON operational report export.
