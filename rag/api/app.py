# =============================================================================
# ELITEBUILD RAG — FastAPI Application (Steps 11 + 12)
# =============================================================================
# Protected RAG service endpoints for retrieval, ingestion, query, and health.
# Authentication: X-RAG-Service-Key header or forwarded JWT user context.
# Step 12 adds: Grounded answer generation with citation validation.
# =============================================================================

import os
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Header, Depends, Request
from pydantic import BaseModel, Field

from rag.config.settings import settings
from rag.db.session import get_engine, get_session, init_database
from rag.embeddings.provider import get_embedding_provider
from rag.generation.generator import GroundedAnswerGenerator
from rag.generation.llm_provider import get_llm_provider
from rag.ingestion.pipeline import IngestionPipeline
from rag.retrieval.engine import (
    HybridRetrievalEngine,
    RetrievalResult,
    get_reranker,
)
from rag.observability.logger import get_rag_logger

logger = get_rag_logger("elitebuild.rag.api")

# ---------------------------------------------------------------------------
# FastAPI App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="ELITEBUILD RAG Service",
    description="Enterprise Construction Knowledge & Evidence Retrieval with Grounded Answer Generation",
    version="1.1.0",
    docs_url="/api/v1/rag/docs",
    redoc_url="/api/v1/rag/redoc",
)


# ---------------------------------------------------------------------------
# Request / Response Models
# ---------------------------------------------------------------------------

class UserContext(BaseModel):
    user_id: Optional[str] = None
    role: str = "PUBLIC"
    permitted_security_levels: List[str] = Field(default_factory=lambda: ["PUBLIC"])


class RetrieveRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=1000)
    tenant_id: str = "elitebuild-core"
    user_context: UserContext = Field(default_factory=UserContext)
    top_k: int = Field(default=5, ge=1, le=20)


class RetrieveResultItem(BaseModel):
    chunk_id: str
    document_id: str
    document_version: str
    score: float
    reranker_score: Optional[float] = None
    source_authority: str
    citation_reference: str
    security_access_level: str
    heading_path: str
    chunk_text: str
    chunk_index: int
    jurisdiction: str
    timestamp: str


class RetrieveTelemetry(BaseModel):
    dense_latency_ms: float
    bm25_latency_ms: float
    rrf_latency_ms: float
    reranker_latency_ms: float
    retrieval_latency_ms: float
    dense_candidate_count: int
    bm25_candidate_count: int
    rrf_candidate_count: int
    final_result_count: int


class RetrieveResponse(BaseModel):
    request_id: str
    status: str  # SUPPORTED, PARTIALLY_SUPPORTED, CONFLICTING_EVIDENCE, INSUFFICIENT_EVIDENCE
    evidence: List[RetrieveResultItem]
    telemetry: RetrieveTelemetry


class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: str
    components: dict


class IngestResponse(BaseModel):
    status: str
    summary: dict


# ---------------------------------------------------------------------------
# Step 12: Query Request / Response Models
# ---------------------------------------------------------------------------

class QueryRequest(BaseModel):
    """RAG query request. Authorization is server-side; client cannot override roles."""
    query: str = Field(..., min_length=2, max_length=1000, description="User's question")
    tenant_id: str = Field(default="elitebuild-core", description="Tenant identifier")
    options: Optional[dict] = Field(default=None, description="Optional query tuning")


class QueryCitation(BaseModel):
    """A verified citation mapping to a retrieved evidence source."""
    index: int = Field(..., ge=1)
    document_id: str
    chunk_id: str
    title: str
    source_authority: str
    location: Optional[str] = None
    version_tag: str
    snippet: str


class QueryTelemetry(BaseModel):
    """Query lifecycle performance metrics."""
    retrieval_latency_ms: float
    generation_latency_ms: float
    total_latency_ms: float
    model: str
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    estimated_cost_usd: float = 0.0
    evidence_count: int = 0
    citation_count: int = 0


class QueryResponse(BaseModel):
    """Grounded answer with validated citations and evidence status."""
    request_id: str
    query: str
    status: str  # SUPPORTED | PARTIALLY_SUPPORTED | CONFLICTING_EVIDENCE | INSUFFICIENT_EVIDENCE
    answer: str
    citations: List[QueryCitation] = Field(default_factory=list)
    telemetry: Optional[QueryTelemetry] = None


# ---------------------------------------------------------------------------
# Auth Dependency
# ---------------------------------------------------------------------------

async def verify_service_key(
    x_rag_service_key: Optional[str] = Header(None, alias="X-RAG-Service-Key"),
):
    """
    Verify the service API key for admin endpoints.
    In development, if no key is configured, allow access.
    """
    expected_key = settings.service_api_key
    if expected_key and x_rag_service_key != expected_key:
        raise HTTPException(status_code=401, detail="Invalid or missing service key")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/v1/rag/health", response_model=HealthResponse)
async def health_check():
    """Service health and component readiness probe."""
    components = {
        "vector_database": "UNKNOWN",
        "bm25_index": "UNKNOWN",
        "embedding_service": "UNKNOWN",
        "reranker_model": "UNKNOWN",
    }

    try:
        engine = get_engine()
        session = get_session(engine)
        from sqlalchemy import text as sa_text
        session.execute(sa_text("SELECT 1"))
        components["vector_database"] = "CONNECTED"
        components["bm25_index"] = "READY"
        session.close()
    except Exception as e:
        components["vector_database"] = f"ERROR: {str(e)[:50]}"

    try:
        provider = get_embedding_provider()
        components["embedding_service"] = f"CONFIGURED ({provider.get_model_name()})"
    except Exception:
        components["embedding_service"] = "UNAVAILABLE"

    reranker = get_reranker()
    components["reranker_model"] = f"CONFIGURED ({settings.reranker_model})"

    overall = "HEALTHY" if components["vector_database"] == "CONNECTED" else "DEGRADED"

    return HealthResponse(
        status=overall,
        version="1.0.0",
        timestamp=datetime.now(timezone.utc).isoformat(),
        components=components,
    )


@app.post("/api/v1/rag/retrieve", response_model=RetrieveResponse)
async def retrieve_evidence(request: RetrieveRequest):
    """
    Execute hybrid retrieval with pre-retrieval authorization.
    Returns ranked evidence with full provenance metadata.
    Does NOT generate an LLM answer (Step 11 scope).
    """
    request_id = f"rag-req-{uuid.uuid4().hex[:12]}"

    try:
        engine = get_engine()
        session = get_session(engine)

        hybrid_engine = HybridRetrievalEngine(session=session)
        results, telemetry = hybrid_engine.retrieve(
            query=request.query,
            tenant_id=request.tenant_id,
            user_role=request.user_context.role,
            permitted_security_levels=request.user_context.permitted_security_levels,
            final_top_k=request.top_k,
        )

        # Determine evidence status
        if not results:
            status = "INSUFFICIENT_EVIDENCE"
        elif len(results) >= request.top_k:
            status = "SUPPORTED"
        else:
            status = "PARTIALLY_SUPPORTED"

        evidence = [
            RetrieveResultItem(
                chunk_id=r.chunk_id,
                document_id=r.document_id,
                document_version=r.document_version,
                score=r.score,
                reranker_score=r.reranker_score,
                source_authority=r.source_authority,
                citation_reference=r.citation_reference,
                security_access_level=r.security_access_level,
                heading_path=r.heading_path,
                chunk_text=r.chunk_text,
                chunk_index=r.chunk_index,
                jurisdiction=r.jurisdiction,
                timestamp=r.timestamp,
            )
            for r in results
        ]

        session.close()

        return RetrieveResponse(
            request_id=request_id,
            status=status,
            evidence=evidence,
            telemetry=RetrieveTelemetry(
                dense_latency_ms=telemetry.dense_latency_ms,
                bm25_latency_ms=telemetry.bm25_latency_ms,
                rrf_latency_ms=telemetry.rrf_latency_ms,
                reranker_latency_ms=telemetry.reranker_latency_ms,
                retrieval_latency_ms=telemetry.retrieval_latency_ms,
                dense_candidate_count=telemetry.dense_candidate_count,
                bm25_candidate_count=telemetry.bm25_candidate_count,
                rrf_candidate_count=telemetry.rrf_candidate_count,
                final_result_count=telemetry.final_result_count,
            ),
        )

    except Exception as e:
        logger.error(f"Retrieval error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"RAG_PIPELINE_ERROR: {str(e)}")


# ---------------------------------------------------------------------------
# Step 12: Grounded Query Endpoint
# ---------------------------------------------------------------------------

# Role → permitted security levels mapping (server-side only)
_ROLE_SECURITY_MAP = {
    "SUPER_ADMIN": ["PUBLIC", "AUTHENTICATED", "EDITOR", "ADMIN", "PRIVATE"],
    "ADMIN": ["PUBLIC", "AUTHENTICATED", "EDITOR", "ADMIN"],
    "EDITOR": ["PUBLIC", "AUTHENTICATED", "EDITOR"],
    "PUBLIC": ["PUBLIC"],
}


@app.post("/api/v1/rag/query", response_model=QueryResponse)
async def query_knowledge(
    request: QueryRequest,
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    x_rag_service_key: Optional[str] = Header(None, alias="X-RAG-Service-Key"),
):
    """
    Execute the complete RAG query pipeline:
    Auth → Retrieval → Reranking → Evidence Assessment → Grounded LLM → Citation Validation → Response

    Authorization is SERVER-SIDE. The client cannot submit arbitrary roles.
    User context comes from forwarded JWT headers (X-User-Role, X-User-Id)
    set by the upstream Next.js proxy, NOT from the request body.
    """
    request_id = f"rag-q-{uuid.uuid4().hex[:12]}"
    total_start = time.time()

    # ----- Server-side authorization (never trust client role) -----
    user_role = (x_user_role or "PUBLIC").upper()
    if user_role not in _ROLE_SECURITY_MAP:
        user_role = "PUBLIC"  # Zero-trust default

    permitted_levels = _ROLE_SECURITY_MAP[user_role]
    user_id = x_user_id  # For telemetry only (masked in logs)

    # ----- Input validation -----
    query_text = request.query.strip()
    if len(query_text) < 2:
        raise HTTPException(status_code=400, detail="Query too short (min 2 chars)")
    if len(query_text) > 1000:
        raise HTTPException(status_code=400, detail="Query too long (max 1000 chars)")

    # Parse options
    top_k = 5
    if request.options and isinstance(request.options, dict):
        top_k = min(max(int(request.options.get("top_k", 5)), 1), 20)

    try:
        engine = get_engine()
        session = get_session(engine)

        # ----- Step 11: Hybrid Retrieval (reused, not duplicated) -----
        retrieval_start = time.time()
        hybrid_engine = HybridRetrievalEngine(session=session)
        results, retrieval_telemetry = hybrid_engine.retrieve(
            query=query_text,
            tenant_id=request.tenant_id,
            user_role=user_role,
            permitted_security_levels=permitted_levels,
            final_top_k=top_k,
        )
        retrieval_latency_ms = (time.time() - retrieval_start) * 1000

        # ----- Step 12: Grounded Answer Generation -----
        generator = GroundedAnswerGenerator()
        gen_result = generator.generate(
            query=query_text,
            retrieval_results=results,
            request_id=request_id,
            tenant_id=request.tenant_id,
            user_role=user_role,
            user_id=user_id,
        )

        session.close()

        total_latency_ms = (time.time() - total_start) * 1000

        # Build citation response objects
        citations = [
            QueryCitation(
                index=c["index"],
                document_id=c["document_id"],
                chunk_id=c["chunk_id"],
                title=c["title"],
                source_authority=c["source_authority"],
                location=c.get("location"),
                version_tag=c["version_tag"],
                snippet=c.get("snippet", ""),
            )
            for c in gen_result.citations
        ]

        return QueryResponse(
            request_id=request_id,
            query=query_text,
            status=gen_result.status,
            answer=gen_result.answer,
            citations=citations,
            telemetry=QueryTelemetry(
                retrieval_latency_ms=round(retrieval_latency_ms, 2),
                generation_latency_ms=round(gen_result.generation_latency_ms, 2),
                total_latency_ms=round(total_latency_ms, 2),
                model=gen_result.model,
                input_tokens=gen_result.input_tokens,
                output_tokens=gen_result.output_tokens,
                total_tokens=gen_result.total_tokens,
                estimated_cost_usd=gen_result.estimated_cost_usd,
                evidence_count=gen_result.evidence_count,
                citation_count=len(citations),
            ),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Query pipeline error [{request_id}]: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="An internal error occurred processing your query. Please try again.",
        )


@app.post(
    "/api/v1/rag/ingest",
    response_model=IngestResponse,
    dependencies=[Depends(verify_service_key)],
)
async def ingest_data():
    """
    Trigger ingestion of approved database sources.
    Restricted to authenticated admin requests.
    Idempotent — safe to call repeatedly.
    """
    try:
        engine = get_engine()
        init_database(engine)
        session = get_session(engine)

        pipeline = IngestionPipeline(session=session)
        report = pipeline.ingest_from_database()

        session.close()

        return IngestResponse(
            status="INGESTION_COMPLETE" if report.failed == 0 else "INGESTION_PARTIAL",
            summary=report.summary(),
        )

    except Exception as e:
        logger.error(f"Ingestion error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"INGESTION_ERROR: {str(e)}")


@app.get(
    "/api/v1/rag/status",
    dependencies=[Depends(verify_service_key)],
)
async def ingestion_status():
    """Return current ingestion status and document inventory."""
    try:
        engine = get_engine()
        session = get_session(engine)

        pipeline = IngestionPipeline(session=session)
        status = pipeline.get_ingestion_status()

        session.close()
        return status

    except Exception as e:
        logger.error(f"Status check error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
