# RAG Service API Specification (FastAPI / OpenAPI)
## M/S ELITE CONSTRUCTION COMPANY — Enterprise RAG Service
### Version 1.0.0 — Production Interface Definition

---

## 1. Overview & Service Boundary

The ELITEBUILD RAG service is hosted as an independent, high-performance microservice built on **Python 3.11+ / FastAPI**. The Next.js web application communicates with this service via internal network calls, passing the caller's verified JWT identity and role.

* **Base URL:** `http://localhost:8000/api/v1/rag` (Internal microservice network)
* **Authentication:** Bearer Service Token (`X-RAG-Service-Key` or `Authorization: Bearer <JWT>`)
* **Content-Type:** `application/json`

---

## 2. API Endpoints

### 2.1 Query Knowledge Base
Execute evidence-grounded retrieval and answer generation.

* **Endpoint:** `POST /api/v1/rag/query`
* **Access:** Public & Authenticated (Authorization determines visibility)

#### Request Body Schema
```json
{
  "query": "What major expressway projects has Elite Construction Company constructed?",
  "tenant_id": "elitebuild-core",
  "user_context": {
    "user_id": "usr-12345",
    "role": "PUBLIC",
    "permitted_security_levels": ["PUBLIC"]
  },
  "options": {
    "top_k": 5,
    "min_rerank_score": 0.35,
    "include_citations": true,
    "stream": false
  }
}
```

#### Response Body Schema (200 OK)
```json
{
  "request_id": "rag-req-7f2c8d19-4b21",
  "status": "SUPPORTED",
  "answer": "M/S Elite Construction Company has constructed several major civil road infrastructure projects, including the Swat Expressway (Package 02) featuring dual-carriageway asphaltic paving and extensive earthworks [1], as well as the rehabilitation of the Peshawar Ring Road [2].",
  "citations": [
    {
      "index": 1,
      "document_id": "doc-swat-expressway-p2",
      "chunk_id": "chk-swat-002",
      "title": "Swat Expressway Package 02 — Project Completion Record",
      "source_authority": "VERIFIED_PROJECT_RECORD",
      "location": "Scope of Works, Paragraph 2",
      "version_tag": "2024.final",
      "snippet": "Package 02 completed on schedule with dual-carriageway asphaltic paving across 34.5 kilometers."
    },
    {
      "index": 2,
      "document_id": "doc-peshawar-ring-road",
      "chunk_id": "chk-prr-001",
      "title": "Peshawar Ring Road Rehabilitation — Contract Record",
      "source_authority": "VERIFIED_PROJECT_RECORD",
      "location": "Executive Summary",
      "version_tag": "2023.1",
      "snippet": "Asphalt concrete wearing course and dualization of commercial arterial corridors."
    }
  ],
  "telemetry": {
    "total_latency_ms": 684.2,
    "retrieval_latency_ms": 52.1,
    "rerank_latency_ms": 78.4,
    "generation_latency_ms": 553.7,
    "prompt_tokens": 792,
    "completion_tokens": 114,
    "estimated_cost_usd": 0.00135,
    "cache_hit": false
  }
}
```

#### Response Status Enum (`status`)
* `SUPPORTED`: Answer is fully corroborated by cited evidence.
* `PARTIALLY_SUPPORTED`: Primary query answered, but specific secondary constraints lack full documentation.
* `CONFLICTING_EVIDENCE`: Reliable documents state conflicting facts; both are presented with citations.
* `INSUFFICIENT_EVIDENCE`: Knowledge base lacks verified facts to answer; no speculation is generated.

---

### 2.2 Service Health & Readiness
Probe service liveness and database / vector index connectivity.

* **Endpoint:** `GET /api/v1/rag/health`
* **Access:** Internal / Unauthenticated

#### Response Body Schema (200 OK)
```json
{
  "status": "HEALTHY",
  "version": "1.0.0",
  "timestamp": "2026-09-30T08:45:00Z",
  "components": {
    "vector_database": "CONNECTED",
    "bm25_index": "READY",
    "embedding_service": "ONLINE",
    "reranker_model": "LOADED"
  }
}
```

---

### 2.3 Document Ingestion (Administrative)
Submit a verified document or structured database entity for parsing, chunking, and dual-indexing.

* **Endpoint:** `POST /api/v1/rag/ingest`
* **Access:** Restricted to `ADMIN` and `SUPER_ADMIN`

#### Request Body Schema
```json
{
  "tenant_id": "elitebuild-core",
  "document_id": "doc-pec-c1-2024",
  "title": "Pakistan Engineering Council License — Category C-1 (No Limit)",
  "source_type": "PDF",
  "source_authority": "VERIFIED_DOCUMENT",
  "security_access_level": "PUBLIC",
  "jurisdiction": "PK",
  "version_tag": "2024.1",
  "raw_content": "... (extracted document text or base64 binary) ...",
  "metadata": {
    "license_number": "PEC-C1-99824",
    "valid_until": "2026-12-31",
    "category": "C-1"
  }
}
```

#### Response Body Schema (201 Created)
```json
{
  "document_id": "doc-pec-c1-2024",
  "chunks_created": 8,
  "dense_vectors_indexed": 8,
  "sparse_tokens_indexed": 8,
  "status": "INGESTION_COMPLETE"
}
```

---

### 2.4 Run Automated Evaluation (Administrative)
Trigger the automated evaluation harness against the gold benchmark dataset.

* **Endpoint:** `POST /api/v1/rag/evaluate`
* **Access:** Restricted to `SUPER_ADMIN`

#### Request Body Schema
```json
{
  "dataset_path": "rag/evaluation/gold_questions.json",
  "metrics": ["recall_at_5", "precision_at_3", "mrr", "ndcg_at_5", "faithfulness"],
  "k_values": [3, 5, 10]
}
```

#### Response Body Schema (200 OK)
```json
{
  "evaluation_id": "eval-20260930-01",
  "timestamp": "2026-09-30T08:50:00Z",
  "test_cases_evaluated": 35,
  "results": {
    "recall_at_5": 0.942,
    "precision_at_3": 0.761,
    "mrr": 0.884,
    "ndcg_at_5": 0.891,
    "faithfulness": 0.978,
    "hallucination_rate": 0.00
  },
  "status": "PASS"
}
```

---

## 3. Standard HTTP Error Codes

| Status Code | Error Code | Description |
| :--- | :--- | :--- |
| `400 Bad Request` | `INVALID_PAYLOAD` | Malformed JSON schema or missing mandatory fields. |
| `401 Unauthorized` | `AUTHENTICATION_REQUIRED` | Missing or expired service Bearer token. |
| `403 Forbidden` | `INSUFFICIENT_PERMISSIONS` | Caller's role is not authorized for requested operation. |
| `429 Too Many Requests` | `RATE_LIMIT_EXCEEDED` | Query quota exceeded for client IP/tenant. |
| `500 Internal Error` | `RAG_PIPELINE_ERROR` | Upstream embedding provider or database error. |
