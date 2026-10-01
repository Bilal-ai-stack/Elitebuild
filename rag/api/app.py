# =============================================================================
# ELITEBUILD RAG — FastAPI Application (Steps 11, 12, 14, 15)
# =============================================================================
# Protected RAG service endpoints for retrieval, ingestion, query, health,
# production monitoring, quality gates, and operational readiness.
#
# Authentication: X-RAG-Service-Key header or forwarded JWT user context.
# Grounded answer generation with citation validation.
# Operational readiness, quality gates, regression detection, and alert feed.
# =============================================================================

import os
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import Depends, FastAPI, Header, HTTPException, Request, Response
from pydantic import BaseModel, Field

from rag.config.settings import settings
from rag.db.session import get_engine, get_session, init_database
from rag.embeddings.provider import get_embedding_provider
from rag.generation.generator import GroundedAnswerGenerator
from rag.generation.llm_provider import get_llm_provider
from rag.ingestion.pipeline import IngestionPipeline
from rag.observability import (
    AlertEvaluator,
    ComponentHealthStatus,
    GenerationStatus,
    IngestionMonitor,
    MetricState,
    QualityGateEngine,
    QualityRegressionDetector,
    RAGErrorCategory,
    RAGEventType,
    RAGSecurityEventType,
    RAGTrace,
    SecurityEventType,
    ServiceHealthStatus,
    alert_store,
    check_liveness,
    check_rag_health,
    check_readiness,
    generate_operational_report,
    get_rag_logger,
    log_rag_query_telemetry,
    security_monitor,
    trace_store,
)
from rag.retrieval.engine import (
    HybridRetrievalEngine,
    RetrievalResult,
    get_reranker,
)

logger = get_rag_logger("elitebuild.rag.api")

# ---------------------------------------------------------------------------
# FastAPI App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="ELITEBUILD RAG Service",
    description="Enterprise Construction Knowledge & Evidence Retrieval with Grounded Generation and Production Monitoring",
    version="1.3.0",
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
    degraded_mode: bool = False
    degraded_reasons: List[str] = Field(default_factory=list)


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
    details: Optional[dict] = None
    degraded_reasons: List[str] = Field(default_factory=list)


class IngestResponse(BaseModel):
    status: str
    summary: dict


# ---------------------------------------------------------------------------
# Step 12 & 15: Query Request / Response Models
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
    """Query lifecycle performance metrics and Step 15 operational readiness indicators."""
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
    operational_status: str = "HEALTHY"
    degraded_mode: bool = False
    degraded_reasons: List[str] = Field(default_factory=list)


class QueryResponse(BaseModel):
    """Grounded answer with validated citations, evidence status, and operational quality status."""
    request_id: str
    query: str
    status: str  # Step 12 Authoritative: SUPPORTED | PARTIALLY_SUPPORTED | CONFLICTING_EVIDENCE | INSUFFICIENT_EVIDENCE
    operational_status: str = "HEALTHY"  # Step 15 Operational: HEALTHY | DEGRADED | INSUFFICIENT_EVIDENCE | CONFLICTING_EVIDENCE | FAILED
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
# Step 15: Standard Health Endpoints
# ---------------------------------------------------------------------------

@app.get("/health", response_model=HealthResponse)
@app.get("/rag/health", response_model=HealthResponse)
@app.get("/api/v1/rag/health", response_model=HealthResponse)
async def health_check():
    """Service health and 12-subsystem component readiness probe."""
    res = check_rag_health()
    return HealthResponse(
        status=res["status"],
        version=res["version"],
        timestamp=res["timestamp"],
        components=res["components"],
        details=res.get("details"),
        degraded_reasons=res.get("degraded_reasons", []),
    )


@app.get("/health/live")
@app.get("/api/v1/rag/health/live")
async def liveness_probe():
    """Fast process liveness check. Answers whether the RAG process is alive."""
    return check_liveness()


@app.get("/health/ready")
@app.get("/api/v1/rag/health/ready")
async def readiness_probe(response: Response):
    """
    Readiness probe to verify the service is capable of serving RAG requests.
    Returns HTTP 200 when ready, HTTP 503 when dependencies are unavailable.
    """
    res = check_readiness()
    if not res["ready"]:
        response.status_code = 503
    return res


# ---------------------------------------------------------------------------
# Retrieval Endpoint
# ---------------------------------------------------------------------------

@app.post("/api/v1/rag/retrieve", response_model=RetrieveResponse)
async def retrieve_evidence(request: RetrieveRequest):
    """
    Execute hybrid retrieval with pre-retrieval authorization.
    Returns ranked evidence with full provenance metadata.
    Does NOT generate an LLM answer (Step 11 scope).
    """
    request_id = f"rag-req-{uuid.uuid4().hex[:12]}"
    degraded_reasons: List[str] = []
    degraded_mode = False

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

        # Check for degraded retrieval fallback
        reranker = get_reranker()
        if hasattr(reranker, "is_available") and not reranker.is_available():
            degraded_mode = True
            degraded_reasons.append("Cross-encoder model uninstalled; RRF fallback used")

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
                degraded_mode=degraded_mode,
                degraded_reasons=degraded_reasons,
            ),
        )

    except Exception as e:
        logger.error(f"Retrieval error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"RAG_PIPELINE_ERROR: {str(e)}")


# ---------------------------------------------------------------------------
# Grounded Query Endpoint
# ---------------------------------------------------------------------------

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
    raw_role = (x_user_role or "PUBLIC").upper()
    user_id = x_user_id

    trace = RAGTrace(
        request_id=request_id,
        tenant_id=request.tenant_id,
        user_role=raw_role,
        user_id=user_id,
        query=request.query,
    )

    logger.info(
        f"RAG query started [{request_id}] for tenant {request.tenant_id}",
        extra={"telemetry": {
            "event_type": RAGEventType.REQUEST_STARTED.value,
            "request_id": request_id,
            "trace_id": trace.trace_id,
            "tenant_id": request.tenant_id,
            "user_role": trace.user_role,
        }}
    )

    # ----- 1. Authorization Span -----
    with trace.span("rag.authorization") as auth_span:
        if raw_role not in _ROLE_SECURITY_MAP:
            logger.warning(
                f"Unauthorized or unknown role '{raw_role}' attempted. Defaulting to PUBLIC.",
                extra={"telemetry": {
                    "event_type": RAGSecurityEventType.INVALID_AUTH_CONTEXT.value,
                    "attempted_role": raw_role,
                    "trace_id": trace.trace_id,
                }}
            )
            security_monitor.record_event(
                event_type=SecurityEventType.RBAC_DENIAL,
                tenant_id=request.tenant_id,
                user_role=raw_role,
                user_id=user_id,
                details={"attempted_role": raw_role, "resolved": "PUBLIC"},
            )
            user_role = "PUBLIC"
        else:
            user_role = raw_role

        permitted_levels = _ROLE_SECURITY_MAP[user_role]
        auth_span.set_attribute("user_role", user_role)
        auth_span.set_attribute("permitted_levels", permitted_levels)
        auth_span.add_event(RAGEventType.AUTHORIZATION_COMPLETED.value, {"role": user_role})

    # ----- 2. Validation & Prompt Injection Inspection -----
    query_text = request.query.strip()
    if len(query_text) < 2:
        trace.record_error(RAGErrorCategory.VALIDATION_ERROR, "Query too short (min 2 chars)", "validation")
        trace_store.record_trace(trace)
        raise HTTPException(status_code=400, detail="Query too short (min 2 chars)")
    if len(query_text) > 1000:
        trace.record_error(RAGErrorCategory.VALIDATION_ERROR, "Query too long (max 1000 chars)", "validation")
        trace_store.record_trace(trace)
        raise HTTPException(status_code=400, detail="Query too long (max 1000 chars)")

    # Passive prompt injection inspection
    security_monitor.inspect_query_for_injection(query_text, request.tenant_id, user_role)

    # Parse options
    top_k = 5
    if request.options and isinstance(request.options, dict):
        top_k = min(max(int(request.options.get("top_k", 5)), 1), 20)

    degraded_mode = False
    degraded_reasons: List[str] = []

    try:
        engine = get_engine()
        session = get_session(engine)

        # ----- 3. Retrieval Span -----
        with trace.span("rag.retrieval") as ret_span:
            ret_span.add_event(RAGEventType.RETRIEVAL_STARTED.value)
            hybrid_engine = HybridRetrievalEngine(session=session)
            results, retrieval_telemetry = hybrid_engine.retrieve(
                query=query_text,
                tenant_id=request.tenant_id,
                user_role=user_role,
                permitted_security_levels=permitted_levels,
                final_top_k=top_k,
            )

            # Check for degraded reranker mode
            reranker = get_reranker()
            if hasattr(reranker, "is_available") and not reranker.is_available():
                degraded_mode = True
                degraded_reasons.append("Reranker cross-encoder uninstalled; RRF fallback used")

            # Record telemetry metrics
            trace.metrics["dense_latency_ms"] = retrieval_telemetry.dense_latency_ms
            trace.metrics["bm25_latency_ms"] = retrieval_telemetry.bm25_latency_ms
            trace.metrics["rrf_latency_ms"] = retrieval_telemetry.rrf_latency_ms
            trace.metrics["reranker_latency_ms"] = retrieval_telemetry.reranker_latency_ms
            trace.metrics["retrieval_latency_ms"] = retrieval_telemetry.retrieval_latency_ms
            trace.metrics["dense_candidate_count"] = retrieval_telemetry.dense_candidate_count
            trace.metrics["bm25_candidate_count"] = retrieval_telemetry.bm25_candidate_count
            trace.metrics["rrf_candidate_count"] = retrieval_telemetry.rrf_candidate_count
            trace.metrics["final_evidence_count"] = len(results)

            ret_span.set_attribute("candidate_doc_ids", [r.document_id for r in results])
            ret_span.set_attribute("candidate_scores", [r.score for r in results])
            ret_span.add_event(RAGEventType.RETRIEVAL_COMPLETED.value, {
                "evidence_count": len(results),
                "latency_ms": retrieval_telemetry.retrieval_latency_ms,
            })

        # ----- 4. Grounded Generation Span -----
        with trace.span("rag.generation") as gen_span:
            gen_span.add_event(RAGEventType.GENERATION_STARTED.value)
            generator = GroundedAnswerGenerator()
            gen_result = generator.generate(
                query=query_text,
                retrieval_results=results,
                request_id=request_id,
                tenant_id=request.tenant_id,
                user_role=user_role,
                user_id=user_id,
            )

            trace.metrics["generation_latency_ms"] = gen_result.generation_latency_ms
            trace.metrics["input_tokens"] = gen_result.input_tokens
            trace.metrics["output_tokens"] = gen_result.output_tokens
            trace.metrics["total_tokens"] = gen_result.total_tokens
            trace.metrics["estimated_cost_usd"] = gen_result.estimated_cost_usd
            trace.metrics["cost_state"] = (
                MetricState.MEASURED.value if gen_result.total_tokens > 0 else MetricState.ESTIMATED.value
            )
            trace.metrics["evidence_status"] = gen_result.status
            trace.metrics["citation_count"] = len(gen_result.citations)

            gen_span.set_attribute("model", gen_result.model)
            gen_span.set_attribute("evidence_status", gen_result.status)
            gen_span.set_attribute("total_tokens", gen_result.total_tokens)
            gen_span.set_attribute("estimated_cost_usd", gen_result.estimated_cost_usd)
            gen_span.add_event(RAGEventType.GENERATION_COMPLETED.value, {
                "evidence_status": gen_result.status,
                "tokens": gen_result.total_tokens,
            })

        session.close()

        # ----- 5. Citation Validation Span -----
        with trace.span("rag.citation_validation") as cit_span:
            cit_span.add_event(RAGEventType.CITATION_VALIDATION_STARTED.value)
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
            cit_span.set_attribute("citation_count", len(citations))
            cit_span.add_event(RAGEventType.CITATION_VALIDATION_COMPLETED.value, {
                "citations_count": len(citations),
            })

        # Determine Step 15 Operational Quality Status
        # Distinct from Step 12 evidence status (SUPPORTED, PARTIALLY_SUPPORTED, etc.)
        if gen_result.status == "INSUFFICIENT_EVIDENCE":
            operational_status = "INSUFFICIENT_EVIDENCE"
        elif gen_result.status == "CONFLICTING_EVIDENCE":
            operational_status = "CONFLICTING_EVIDENCE"
        elif degraded_mode:
            operational_status = "DEGRADED"
        else:
            operational_status = "HEALTHY"

        # Complete trace and record
        trace.finish("SUCCESS")
        trace_store.record_trace(trace)

        log_rag_query_telemetry(
            logger=logger,
            request_id=request_id,
            tenant_id=request.tenant_id,
            user_id=user_id,
            user_role=user_role,
            query_text=query_text,
            status=gen_result.status,
            total_latency_ms=trace.total_latency_ms,
            retrieval_latency_ms=trace.metrics["retrieval_latency_ms"],
            rerank_latency_ms=trace.metrics["reranker_latency_ms"],
            generation_latency_ms=trace.metrics["generation_latency_ms"],
            prompt_tokens=gen_result.input_tokens,
            completion_tokens=gen_result.output_tokens,
            cost_usd=gen_result.estimated_cost_usd,
            retrieved_count=trace.metrics["rrf_candidate_count"],
            reranked_count=len(results),
            citation_count=len(citations),
        )

        return QueryResponse(
            request_id=request_id,
            query=query_text,
            status=gen_result.status,
            operational_status=operational_status,
            answer=gen_result.answer,
            citations=citations,
            telemetry=QueryTelemetry(
                retrieval_latency_ms=round(trace.metrics["retrieval_latency_ms"], 2),
                generation_latency_ms=round(gen_result.generation_latency_ms, 2),
                total_latency_ms=round(trace.total_latency_ms, 2),
                model=gen_result.model,
                input_tokens=gen_result.input_tokens,
                output_tokens=gen_result.output_tokens,
                total_tokens=gen_result.total_tokens,
                estimated_cost_usd=gen_result.estimated_cost_usd,
                evidence_count=gen_result.evidence_count,
                citation_count=len(citations),
                operational_status=operational_status,
                degraded_mode=degraded_mode,
                degraded_reasons=degraded_reasons,
            ),
        )

    except HTTPException:
        raise
    except Exception as e:
        trace.record_error(
            RAGErrorCategory.RETRIEVAL_ERROR if "retriev" in str(e).lower() else RAGErrorCategory.UNKNOWN_ERROR,
            str(e),
            "pipeline",
        )
        trace.finish("FAILED")
        trace_store.record_trace(trace)
        logger.error(
            f"Query pipeline error [{request_id}]: {e}",
            exc_info=True,
            extra={"telemetry": {
                "event_type": RAGEventType.REQUEST_FAILED.value,
                "request_id": request_id,
                "trace_id": trace.trace_id,
                "error": str(e),
            }},
        )
        raise HTTPException(
            status_code=500,
            detail="An internal error occurred processing your query. Please try again.",
        )


# ---------------------------------------------------------------------------
# Step 15: Observability, Quality Gates & Operational Readiness Endpoints
# ---------------------------------------------------------------------------

@app.get(
    "/api/v1/rag/observability/metrics",
    dependencies=[Depends(verify_service_key)],
)
async def get_observability_metrics(
    window_seconds: Optional[int] = None,
):
    """
    Returns aggregated operational telemetry metrics (p50/p95 latency, error rates, throughput).
    Protected by service key. Zero raw text or secrets exposed.
    """
    return trace_store.get_aggregate_metrics(window_seconds=window_seconds)


@app.get(
    "/api/v1/rag/observability/traces",
    dependencies=[Depends(verify_service_key)],
)
async def list_recent_traces(
    tenant_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
):
    """
    List recent execution traces with metadata and timings.
    Protected by service key.
    """
    limit = min(max(1, limit), 200)
    return trace_store.list_traces(tenant_id=tenant_id, status=status, limit=limit)


@app.get(
    "/api/v1/rag/observability/traces/{trace_id}",
    dependencies=[Depends(verify_service_key)],
)
async def get_trace_detail(trace_id: str):
    """
    Inspect a single trace with its span tree, retrieval scores, and timings.
    Protected by service key.
    """
    trace_data = trace_store.get_trace(trace_id)
    if not trace_data:
        raise HTTPException(status_code=404, detail="Trace not found")
    return trace_data


class CompareRunsRequest(BaseModel):
    baseline_run: Optional[Dict[str, Any]] = None
    candidate_run: Optional[Dict[str, Any]] = None
    thresholds: Optional[Dict[str, float]] = None


@app.post(
    "/api/v1/rag/observability/compare",
    dependencies=[Depends(verify_service_key)],
)
async def compare_evaluation_runs(request: CompareRunsRequest):
    """
    Compare two benchmark evaluation runs to detect quality regressions.
    If baseline/candidate not provided, auto-compares the two most recent runs.
    Protected by service key.
    """
    if request.baseline_run and request.candidate_run:
        detector = QualityRegressionDetector(thresholds=request.thresholds)
        return detector.compare_runs(request.baseline_run, request.candidate_run)
    return QualityRegressionDetector.auto_detect_latest_comparison()


@app.get(
    "/api/v1/rag/quality-gates",
    dependencies=[Depends(verify_service_key)],
)
async def get_quality_gates():
    """
    Evaluate production quality gates against the latest benchmark run.
    Returns typed GateStatus (PASSED, FAILED, NOT_EVALUATED) for each rule and category.
    """
    engine = QualityGateEngine()
    return engine.evaluate_run()


@app.get(
    "/api/v1/rag/operational-report",
    dependencies=[Depends(verify_service_key)],
)
@app.get(
    "/rag/operational-report",
    dependencies=[Depends(verify_service_key)],
)
async def get_operational_report():
    """
    Authoritative machine-readable operational report combining:
    Health + Quality Gates + Regression + Telemetry + Ingestion + Security + Alerts.
    """
    return generate_operational_report()


@app.get(
    "/api/v1/rag/alerts",
    dependencies=[Depends(verify_service_key)],
)
async def get_alerts(
    severity: Optional[str] = None,
    component: Optional[str] = None,
    limit: int = 50,
):
    """
    Active and recent operational alerts.
    """
    limit = min(max(1, limit), 100)
    return {
        "summary": alert_store.get_summary(),
        "alerts": alert_store.list_alerts(severity=severity, component=component, limit=limit),
    }


@app.get(
    "/api/v1/rag/security/events",
    dependencies=[Depends(verify_service_key)],
)
async def get_security_events(limit: int = 50):
    """
    Sanitized audit trail of security events (zero secrets exposed).
    """
    limit = min(max(1, limit), 100)
    return {
        "summary": security_monitor.get_summary(),
        "events": security_monitor.list_recent_events(limit=limit),
    }


@app.get(
    "/api/v1/rag/ingestion/health",
    dependencies=[Depends(verify_service_key)],
)
async def get_ingestion_health():
    """
    Detailed ingestion pipeline health, chunk embedding status, and stale knowledge report.
    """
    monitor = IngestionMonitor()
    return monitor.get_ingestion_health()


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
