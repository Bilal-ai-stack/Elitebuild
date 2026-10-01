# Enterprise Construction Knowledge & Project Evidence RAG Architecture
## M/S ELITE CONSTRUCTION COMPANY — Engineers & Constructors
### Architectural Blueprint & Technical Foundation (Edversity Production Standard)

---

## 1. System Overview

The **ELITEBUILD Enterprise Construction Knowledge & Project Evidence RAG** is an intelligent retrieval and evidence-grounded synthesis system designed for **M/S ELITE CONSTRUCTION COMPANY**. It enables clients, government tender evaluation committees, resident engineers, partners, and internal project managers to query verified corporate credentials, civil engineering capabilities, past project performance, equipment fleets, and authorized technical documents with zero hallucination and strict cryptographic citation traceability.

### 1.1 Architecture Goals
1. **High Evidence Fidelity:** Answers must be directly grounded in verified corporate records, PEC registrations, and project contracts.
2. **Pre-Retrieval Authorization:** Strict security boundaries; unauthorized documents must **never** be retrieved into working memory.
3. **Hybrid Precision:** Dense semantic search combined with BM25 sparse keyword matching, fused via Reciprocal Rank Fusion (RRF) and validated via a Cross-Encoder Reranker.
4. **Typed Response Statuses:** Strict status signaling (`SUPPORTED`, `PARTIALLY_SUPPORTED`, `CONFLICTING_EVIDENCE`, `INSUFFICIENT_EVIDENCE`).
5. **Clear Service Boundary:** Separation between the existing Next.js web application and the Python FastAPI RAG service.

---

## 2. Full-Stack Boundary & Topology

```
┌────────────────────────────────────────────────────────────────────────┐
│                   PUBLIC & ADMINISTRATIVE CLIENTS                      │
│                  Web Browsers / Mobile Clients                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  ELITEBUILD Next.js Web Application                    │
│   - Public UI & Admin Dashboard (React 19 / App Router)                │
│   - Authentication & Session Verification (JOSE / JWT Cookies)         │
│   - Source Database (PostgreSQL via Prisma ORM)                        │
│   - Document Storage (/storage/documents/ & /public/uploads/)           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Internal HTTPS / Service Auth Token
                                    │ (Forwarding User Identity & Role)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        FastAPI RAG Microservice                        │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 1. Identity & Pre-Retrieval Authorization Filter                  │  │
│  │    (Filters by tenant_id, security_access_level, role)           │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
│                                     ▼                                  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 2. Hybrid Retrieval Engine                                       │  │
│  │    ├── Dense Vector Search (pgvector / HNSW index)                │  │
│  │    └── Sparse BM25 Keyword Search (Exact Codes, IDs, PEC)         │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
│                                     ▼                                  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 3. Reciprocal Rank Fusion (RRF, k=60)                            │  │
│  │    Merges top-N dense and sparse candidates                       │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
│                                     ▼                                  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 4. Cross-Encoder Reranker                                        │  │
│  │    Deep pairwise relevance scoring (Top-K selection)             │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
│                                     ▼                                  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 5. Grounded LLM Answer Engine                                    │  │
│  │    Structured prompt, citation attribution, typed status check   │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
│                                     ▼                                  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 6. Observability & Telemetry Pipeline                            │  │
│  │    Structured JSON traces: latency, token counts, cost, cache    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Sources & Source Authority Hierarchy

Knowledge assets within M/S ELITE CONSTRUCTION COMPANY vary in evidentiary authority. The system enforces an explicit hierarchy to prevent marketing descriptions from superseding signed legal certificates.

| Authority Tier | Source Type | Example Content | Primary Keys / Locators |
| :--- | :--- | :--- | :--- |
| **Tier 1 (Highest)** | `VERIFIED_DOCUMENT` | PEC C-1 License, ISO 9001 Certificates, signed Work Completion Certificates, FBR NTN Registration. | Document UUID, PEC License Number. |
| **Tier 2** | `VERIFIED_PROJECT_RECORD` | Swat Expressway, Ring Road Rehabilitation, contract values, client department references. | Project ID, Project Slug. |
| **Tier 3** | `VERIFIED_COMPANY_RECORD` | Legal entity name, registered office addresses, incorporation year (2006), bank affiliations. | Company ID, SiteSetting Keys. |
| **Tier 4** | `ADMIN_AUTHORED_CONTENT` | Equipment fleet inventory counts, verified civil engineering capabilities, executive team profiles. | Equipment ID, TeamMember ID. |
| **Tier 5** | `USER_PROVIDED_CONTENT` | Inquiries submitted via contact forms, public clarification requests. | Inquiry ID. |

### Conflict Resolution Strategy
When an older project record conflicts with a newer performance certificate (e.g., project completion dates or revised bridge deck spans):
1. **Timestamp / Version Tagging:** The engine checks `version_tag` and `timestamp`. The more recent authenticated record is prioritized.
2. **Authority Supersession:** Tier 1 documents strictly override Tier 4 descriptions.
3. **Ambiguity Escalation:** If two equally authoritative documents present contradictory facts (e.g., conflicting milestone dates across contract amendments), the engine returns `status: "CONFLICTING_EVIDENCE"` with citations to both sources rather than hallucinating an average.

---

## 4. Mandatory Metadata Model

Every indexed chunk in the knowledge base is governed by seven mandatory metadata attributes conforming to the Edversity AI Solutions Engineering standard:

```json
{
  "tenant_id": "elitebuild-core",
  "document_id": "doc-pec-c1-license-2024",
  "chunk_id": "chk-pec-c1-license-2024-004",
  "chunk_index": 4,
  "version_tag": "2024.1-verified",
  "timestamp": "2024-01-15T00:00:00Z",
  "security_access_level": "PUBLIC",
  "jurisdiction": "PK-KP-ISB",
  "source_authority": "VERIFIED_DOCUMENT",
  "source_location": {
    "section": "Category & Specialization Codes",
    "page": 2,
    "table_index": 1
  },
  "content_status": "PUBLISHED"
}
```

### Definitions:
* `tenant_id`: Multi-tenant partition key (default `elitebuild-core`).
* `document_id`: Stable parent document identifier.
* `version_tag`: Semantic document version string (e.g., `2024.v1`, `2026.final`).
* `timestamp`: ISO-8601 creation or verification date.
* `security_access_level`: One of `PUBLIC`, `AUTHENTICATED`, `EDITOR`, `ADMIN`, `PRIVATE`.
* `jurisdiction`: Regulatory territory (e.g., `PK` for Pakistan federal, `PK-KP` for Khyber Pakhtunkhwa, `PK-ISB` for Islamabad Capital Territory).
* `source_authority`: One of the 5 authority tiers defined in Section 3.

---

## 5. Ingestion Pipeline & Chunking Strategy

### 5.1 Pipeline Flow
```
Raw Database / Documents (PDF, DOCX, DB Tables)
  ↓
Validation & Sanitization (Reject corrupted files, malformed encoding)
  ↓
Structure-Aware Extractor (PDF OCR / Markdown parser / Tabular unroller)
  ↓
Document Level Metadata Assignment (Assign tenant, security, authority)
  ↓
Semantic Hierarchy Chunking (Heading-aware sliding window with table preservation)
  ↓
Embedding Generation (Dense representation via text-embedding-3-small or bge-large-en)
  ↓
Dual-Store Ingestion:
  ├── Vector Index (PostgreSQL pgvector / HNSW)
  └── BM25 Lexical Index (Elasticsearch / OpenSearch / SQLite FTS5)
```

### 5.2 Chunking Guidelines for Construction Documents
Construction documents (Bills of Quantities, PEC licenses, Project Specifications) suffer from high data density. Fixed-token arbitrary splitting breaks table rows and critical clauses.
* **Target Chunk Size:** 400 – 600 tokens (~1,800 – 2,500 characters).
* **Chunk Overlap:** 100 tokens (~400 characters) preserving context across boundary clauses.
* **Heading Preservation:** Every chunk prepends its ancestral hierarchy (e.g., `[Header: Swat Expressway Section II > Technical Scope > Asphaltic Base Course]`).
* **Table Handling:** Tables are serialized into Markdown table syntax or JSON key-value pairs before embedding to prevent column-row misassociation.
* **Boilerplate Stripping:** Repetitive header/footer stamps, page numbering lines, and legal disclaimers are scrubbed during parsing to conserve embedding bandwidth.

---

## 6. Hybrid Retrieval, RRF & Cross-Encoder Reranking

```
                                  [ User Query ]
                                         │
                        ┌────────────────┴────────────────┐
                        ▼                                 ▼
             [ Dense Semantic Search ]          [ Sparse BM25 Search ]
             Cosine similarity on               Exact match on project names,
             embeddings                         PEC codes, certificate IDs
                        │                                 │
                        │ Top-50 candidates               │ Top-50 candidates
                        └────────────────┬────────────────┘
                                         ▼
                        [ Reciprocal Rank Fusion (RRF) ]
                              k = 60 constant
                                         │
                                         ▼ Top-25 candidates
                        [ Cross-Encoder Reranker ]
                        (e.g., bge-reranker-large / ms-marco-MiniLM)
                        Pairwise Query-Document relevance scoring
                                         │
                                         ▼ Top-5 Evidence Chunks
                        [ Prompt Assembly & LLM Generation ]
```

### 6.1 Reciprocal Rank Fusion (RRF) Formula
$$RRF(d) = \sum_{m \in M} \frac{1}{k + r_m(d)}$$
Where:
* $M$ is the set of retrievers (Dense + BM25).
* $r_m(d)$ is the 1-based rank of document $d$ in retriever $m$.
* $k$ is the smoothing constant set to **60**.

### 6.2 Cross-Encoder Reranking
While bi-encoders generate separate embeddings for query and document, the cross-encoder processes `[CLS] Query [SEP] Chunk [SEP]` simultaneously through all transformer layers, capturing intricate semantic nuances and exact requirement constraints. Chunks scoring below a calibrated confidence threshold (e.g., `< 0.35`) are pruned prior to prompt assembly.

---

## 7. Pre-Retrieval Authorization

To eliminate information leakage and adhere to enterprise security mandates:
**Authorization is executed prior to vector or lexical search.**

```sql
-- Conceptual pre-retrieval vector query in PostgreSQL + pgvector
SELECT chunk_id, document_id, chunk_text, 1 - (embedding <=> :query_embedding) AS similarity
FROM rag_chunks
WHERE tenant_id = :user_tenant_id
  AND security_access_level = ANY(:permitted_security_levels)
  AND content_status = 'PUBLISHED'
ORDER BY embedding <=> :query_embedding
LIMIT 50;
```

* Unauthenticated public users are assigned `permitted_security_levels = ['PUBLIC']`.
* Authenticated internal staff receive `['PUBLIC', 'AUTHENTICATED', 'EDITOR']`.
* Super administrators receive `['PUBLIC', 'AUTHENTICATED', 'EDITOR', 'ADMIN', 'PRIVATE']`.
* **Zero Post-Filtering Leakage:** Chunks belonging to confidential client tenders or private administrative contracts are never pulled into server RAM for unauthorized queries.

---

## 8. Grounded Generation, Citations & Typed Statuses

### 8.1 Typed Response Statuses
The LLM response engine evaluates the relationship between retrieved evidence and the generated answer, outputting one of four immutable statuses:

1. **`SUPPORTED`**: The retrieved evidence completely and unambiguously corroborates every factual assertion in the answer.
2. **`PARTIALLY_SUPPORTED`**: The core question is addressed, but secondary details (e.g., exact quantities, completion month) are unconfirmed in the knowledge base.
3. **`CONFLICTING_EVIDENCE`**: Authoritative sources contain conflicting information (e.g., differing contract values between tender award and final certificate). Both are cited.
4. **`INSUFFICIENT_EVIDENCE`**: The knowledge base contains no verified evidence regarding the query. The model explicitly states lack of information rather than inferring.

### 8.2 Citation Model
Every claim in the answer is backed by inline bracketed numeric indices linked to an immutable citation payload:
```json
{
  "citations": [
    {
      "index": 1,
      "document_id": "doc-swat-expressway-completion",
      "title": "Substantial Completion Certificate — Swat Expressway PK-02",
      "source_authority": "VERIFIED_DOCUMENT",
      "location": "Page 2, Paragraph 3",
      "version_tag": "2024.final",
      "quote": "The dual-carriageway asphaltic paving spanning 34.5 km has been inspected and certified complete."
    }
  ]
}
```

---

## 9. Evaluation Framework

The RAG platform incorporates a continuous evaluation harness measuring both retrieval performance and generation quality.

### 9.1 Retrieval Metrics
* **Recall@K (K=3, 5, 10):** Fraction of relevant ground-truth chunks retrieved in top-K.
* **Precision@K (K=3, 5, 10):** Proportion of retrieved top-K chunks that are genuinely relevant.
* **Mean Reciprocal Rank (MRR):** Reciprocal rank of the first relevant chunk: $MRR = \frac{1}{|Q|} \sum_{i=1}^{|Q|} \frac{1}{\text{rank}_i}$.
* **NDCG@K (Normalized Discounted Cumulative Gain):** Evaluates ranking quality based on graded relevance.

### 9.2 Generation Metrics (Ragas / DeepEval Integration)
* **Faithfulness:** Verifies that all generated claims are grounded in retrieved context (Target: $\ge 0.95$).
* **Answer Relevance / Correctness:** Measures alignment between question intent and synthesized answer (Target: $\ge 0.90$).
* **Hallucination Rate:** Frequency of unverified factual assertions (Target: $< 0.02$).

---

## 10. Observability & Telemetry

Every request generates a structured, append-only JSON telemetry entry.

```json
{
  "request_id": "rag-req-8f4b1e02-9981",
  "timestamp": "2026-09-30T08:45:00Z",
  "tenant_id": "elitebuild-core",
  "user_role": "PUBLIC",
  "query": "What is Elite Construction Company's PEC license category?",
  "authorization": {
    "permitted_levels": ["PUBLIC"],
    "records_scanned": 1420
  },
  "retrieval": {
    "dense_candidates": 50,
    "sparse_candidates": 50,
    "rrf_candidates": 25,
    "reranked_top_k": 5,
    "vector_cache_hit": false
  },
  "latency_ms": {
    "retrieval_dense": 42.1,
    "retrieval_sparse": 18.4,
    "rrf": 2.1,
    "reranker": 85.3,
    "llm_generation": 620.5,
    "total": 768.4
  },
  "tokens": {
    "prompt_tokens": 840,
    "completion_tokens": 125,
    "total_tokens": 965
  },
  "estimated_cost_usd": 0.00142,
  "status": "SUPPORTED",
  "citation_count": 2
}
```

---

## 11. Technology Stack Decisions

| Component | Selected Technology | Justification |
| :--- | :--- | :--- |
| **API Framework** | Python 3.11+ / FastAPI | Native async support, high throughput, standard for ML/RAG pipelines, automatic OpenAPI documentation. |
| **Primary Vector Store** | PostgreSQL + `pgvector` | Leverages existing production PostgreSQL infrastructure; supports transactional ACID guarantees, HNSW indexing, and unified backup workflows. |
| **Sparse Lexical Search** | BM25 via PostgreSQL Full-Text Search (or SQLite FTS5 for local testing) | Eliminates need for additional cluster infrastructure while providing exact keyword matching for project codes and PEC credentials. |
| **Embedding Model** | Provider-Agnostic (e.g., OpenAI `text-embedding-3-small` / BGE-large) | Balanced dimensionality (1536), low latency, and cost efficiency. Configured via environment variables. |
| **Reranker Model** | `BAAI/bge-reranker-base` or cross-encoder API | Proven benchmark performance in multi-lingual and technical document domain. |
| **Evaluation Suite** | Ragas + DeepEval | Industry standard for reference-free and reference-based RAG metric benchmarking. |
| **Observability** | Structured JSON Logging (OpenTelemetry compatible) | Lightweight, zero-dependency overhead, portable to LangSmith, Arize Phoenix, or Datadog. Documented in [docs/RAG_OBSERVABILITY.md](file:///c:/Users/Bilal%20ahmad/OneDrive/Desktop/Elitebuild/docs/RAG_OBSERVABILITY.md). |
