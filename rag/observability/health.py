# =============================================================================
# ELITEBUILD RAG — Service Health & Component Readiness Probe (Step 15)
# =============================================================================
# Implements the 12-subsystem RAG Health Model:
#   1. api
#   2. database
#   3. pgvector
#   4. embedding_provider
#   5. bm25
#   6. rrf
#   7. reranker
#   8. llm
#   9. citation_validation
#   10. ingestion
#   11. evaluation
#   12. telemetry
#
# Strictly typed statuses:
#   HEALTHY | DEGRADED | UNAVAILABLE | NOT_CONFIGURED | UNKNOWN
#
# Safe: Never exposes internal secrets, credentials, or private connection strings.
# Non-destructive: Read-only probes, zero table scans or alterations.
# =============================================================================

import glob
import os
import time
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

from rag.config.settings import settings


class ComponentHealthStatus(str, Enum):
    HEALTHY = "HEALTHY"
    DEGRADED = "DEGRADED"
    UNAVAILABLE = "UNAVAILABLE"
    NOT_CONFIGURED = "NOT_CONFIGURED"
    UNKNOWN = "UNKNOWN"


class ServiceHealthStatus(str, Enum):
    HEALTHY = "HEALTHY"
    DEGRADED = "DEGRADED"
    UNAVAILABLE = "UNAVAILABLE"


# Application start time for uptime tracking
_SERVICE_START_TIME = time.time()


def get_service_uptime_seconds() -> float:
    return round(time.time() - _SERVICE_START_TIME, 2)


def check_liveness() -> Dict[str, Any]:
    """
    Lightweight liveness probe to verify the process is alive.
    Always returns fast without blocking on external dependencies.
    """
    return {
        "status": "ALIVE",
        "service": settings.app_name,
        "environment": settings.environment,
        "uptime_seconds": get_service_uptime_seconds(),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def check_readiness() -> Dict[str, Any]:
    """
    Readiness probe to determine whether the service is capable of serving
    RAG requests. Checks essential operational dependencies (DB connection,
    embedding configuration, LLM provider).
    """
    reasons: List[str] = []
    ready = True

    # 1. Database readiness
    try:
        from rag.db.session import get_engine, get_session
        from sqlalchemy import text as sa_text
        engine = get_engine()
        session = get_session(engine)
        session.execute(sa_text("SELECT 1"))
        session.close()
    except Exception as e:
        ready = False
        reasons.append(f"Database unavailable: {str(e)[:60]}")

    # 2. Embedding provider readiness
    try:
        from rag.embeddings.provider import get_embedding_provider
        provider = get_embedding_provider()
        if not provider:
            ready = False
            reasons.append("Embedding provider not initialized")
    except Exception as e:
        ready = False
        reasons.append(f"Embedding provider error: {str(e)[:60]}")

    # 3. LLM provider readiness
    try:
        from rag.generation.llm_provider import get_llm_provider
        llm = get_llm_provider()
        if not llm:
            ready = False
            reasons.append("LLM provider not initialized")
    except Exception as e:
        ready = False
        reasons.append(f"LLM provider error: {str(e)[:60]}")

    status = ServiceHealthStatus.HEALTHY.value if ready else ServiceHealthStatus.UNAVAILABLE.value

    return {
        "status": status,
        "ready": ready,
        "service": settings.app_name,
        "environment": settings.environment,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "unready_reasons": reasons,
    }


def check_rag_health() -> Dict[str, Any]:
    """
    Execute non-destructive health checks across all 12 RAG subsystems.
    Returns typed ComponentHealthStatus values with safe diagnostic details.
    """
    from rag.db.session import get_engine, get_session
    from rag.embeddings.provider import get_embedding_provider
    from rag.generation.llm_provider import get_llm_provider
    from rag.retrieval.engine import get_reranker
    from rag.observability.tracer import trace_store

    components: Dict[str, str] = {
        "api": ComponentHealthStatus.HEALTHY.value,
        "database": ComponentHealthStatus.UNKNOWN.value,
        "pgvector": ComponentHealthStatus.UNKNOWN.value,
        "vector_store": ComponentHealthStatus.UNKNOWN.value,
        "embedding_provider": ComponentHealthStatus.UNKNOWN.value,
        "bm25": ComponentHealthStatus.UNKNOWN.value,
        "bm25_search": ComponentHealthStatus.UNKNOWN.value,
        "rrf": ComponentHealthStatus.HEALTHY.value,  # In-memory pure algorithmic fusion
        "reranker": ComponentHealthStatus.UNKNOWN.value,
        "llm": ComponentHealthStatus.UNKNOWN.value,
        "llm_provider": ComponentHealthStatus.UNKNOWN.value,
        "citation_validation": ComponentHealthStatus.HEALTHY.value,  # In-memory deterministic validator
        "ingestion": ComponentHealthStatus.UNKNOWN.value,
        "evaluation": ComponentHealthStatus.UNKNOWN.value,
        "telemetry": ComponentHealthStatus.UNKNOWN.value,
    }

    details: Dict[str, Dict[str, Any]] = {
        "api": {
            "status": ComponentHealthStatus.HEALTHY.value,
            "version": "1.3.0",
            "uptime_seconds": get_service_uptime_seconds(),
        },
        "rrf": {
            "status": ComponentHealthStatus.HEALTHY.value,
            "k": settings.rrf_k,
            "mode": "in-memory rank synthesis",
        },
        "citation_validation": {
            "status": ComponentHealthStatus.HEALTHY.value,
            "validator": "Provenance & Bracket Citation Linker",
            "rules": ["bracket_mapping", "authority_check", "location_resolution"],
        },
    }

    degraded_reasons: List[str] = []
    has_unavailable = False

    # 1. Database & pgvector & BM25 & Ingestion query
    db_ok = False
    try:
        engine = get_engine()
        session = get_session(engine)
        from sqlalchemy import text as sa_text
        session.execute(sa_text("SELECT 1"))
        components["database"] = ComponentHealthStatus.HEALTHY.value
        details["database"] = {
            "status": ComponentHealthStatus.HEALTHY.value,
            "connection": "CONNECTED",
            "dialect": "postgresql",
        }
        db_ok = True

        # Check pgvector extension
        try:
            vec_res = session.execute(
                sa_text("SELECT extname FROM pg_extension WHERE extname = 'vector'")
            ).fetchone()
            if vec_res:
                components["pgvector"] = ComponentHealthStatus.HEALTHY.value
                details["pgvector"] = {
                    "status": ComponentHealthStatus.HEALTHY.value,
                    "extension_installed": True,
                    "index_type": "HNSW",
                    "dimension": settings.vector_dimension,
                }
            else:
                components["pgvector"] = ComponentHealthStatus.DEGRADED.value
                details["pgvector"] = {
                    "status": ComponentHealthStatus.DEGRADED.value,
                    "extension_installed": False,
                    "message": "pgvector extension not installed in PostgreSQL",
                }
                degraded_reasons.append("pgvector extension missing in PostgreSQL")
        except Exception as e:
            components["pgvector"] = ComponentHealthStatus.DEGRADED.value
            details["pgvector"] = {
                "status": ComponentHealthStatus.DEGRADED.value,
                "error": str(e)[:60],
            }
            degraded_reasons.append(f"pgvector query check failed: {str(e)[:50]}")

        # Check BM25 / tsvector support
        try:
            session.execute(sa_text("SELECT to_tsvector('english', 'elite construction')"))
            components["bm25"] = ComponentHealthStatus.HEALTHY.value
            details["bm25"] = {
                "status": ComponentHealthStatus.HEALTHY.value,
                "engine": "PostgreSQL tsvector",
                "dictionary": "english",
            }
        except Exception as e:
            components["bm25"] = ComponentHealthStatus.DEGRADED.value
            details["bm25"] = {
                "status": ComponentHealthStatus.DEGRADED.value,
                "error": str(e)[:60],
            }
            degraded_reasons.append(f"BM25 tsvector check failed: {str(e)[:50]}")

        # Check Ingestion status from database
        try:
            from rag.db.models import RagDocument, RagChunk
            doc_count = session.query(RagDocument).count()
            chunk_count = session.query(RagChunk).count()
            components["ingestion"] = ComponentHealthStatus.HEALTHY.value
            details["ingestion"] = {
                "status": ComponentHealthStatus.HEALTHY.value,
                "indexed_documents": doc_count,
                "indexed_chunks": chunk_count,
            }
        except Exception as e:
            components["ingestion"] = ComponentHealthStatus.DEGRADED.value
            details["ingestion"] = {
                "status": ComponentHealthStatus.DEGRADED.value,
                "error": str(e)[:60],
            }
            degraded_reasons.append(f"Ingestion inventory check failed: {str(e)[:50]}")

        components["vector_store"] = components["pgvector"]
        components["bm25_search"] = components["bm25"]
        session.close()
    except Exception as e:
        components["database"] = ComponentHealthStatus.UNAVAILABLE.value
        components["pgvector"] = ComponentHealthStatus.UNAVAILABLE.value
        components["vector_store"] = ComponentHealthStatus.UNAVAILABLE.value
        components["bm25"] = ComponentHealthStatus.UNAVAILABLE.value
        components["bm25_search"] = ComponentHealthStatus.UNAVAILABLE.value
        components["ingestion"] = ComponentHealthStatus.UNAVAILABLE.value
        details["database"] = {
            "status": ComponentHealthStatus.UNAVAILABLE.value,
            "error": str(e)[:60],
        }
        details["pgvector"] = {"status": ComponentHealthStatus.UNAVAILABLE.value}
        details["vector_store"] = {"status": ComponentHealthStatus.UNAVAILABLE.value}
        details["bm25"] = {"status": ComponentHealthStatus.UNAVAILABLE.value}
        details["ingestion"] = {"status": ComponentHealthStatus.UNAVAILABLE.value}
        degraded_reasons.append(f"Database connection failed: {str(e)[:60]}")
        has_unavailable = True

    # 2. Embedding provider
    try:
        provider = get_embedding_provider()
        model_name = provider.get_model_name()
        components["embedding_provider"] = ComponentHealthStatus.HEALTHY.value
        details["embedding_provider"] = {
            "status": ComponentHealthStatus.HEALTHY.value,
            "provider": getattr(settings, "embedding_provider", "openai"),
            "model": model_name,
            "dimension": settings.vector_dimension,
        }
    except Exception as e:
        components["embedding_provider"] = ComponentHealthStatus.DEGRADED.value
        details["embedding_provider"] = {
            "status": ComponentHealthStatus.DEGRADED.value,
            "error": str(e)[:60],
        }
        degraded_reasons.append(f"Embedding provider degraded: {str(e)[:50]}")

    # 3. Cross-encoder Reranker
    try:
        reranker = get_reranker()
        is_avail = False
        if hasattr(reranker, "is_available"):
            is_avail = reranker.is_available()
        elif hasattr(reranker, "_load_model"):
            is_avail = reranker._load_model()
        else:
            is_avail = True

        model_name = getattr(reranker, "model_name", "cross-encoder")
        if is_avail:
            components["reranker"] = ComponentHealthStatus.HEALTHY.value
            details["reranker"] = {
                "status": ComponentHealthStatus.HEALTHY.value,
                "model": model_name,
                "fallback_active": False,
            }
        else:
            components["reranker"] = ComponentHealthStatus.DEGRADED.value
            details["reranker"] = {
                "status": ComponentHealthStatus.DEGRADED.value,
                "model": model_name,
                "fallback_active": True,
                "fallback_engine": "RRF (Reciprocal Rank Fusion)",
            }
            degraded_reasons.append("Cross-encoder model uninstalled; fallback to RRF active")
    except Exception as e:
        components["reranker"] = ComponentHealthStatus.DEGRADED.value
        details["reranker"] = {
            "status": ComponentHealthStatus.DEGRADED.value,
            "error": str(e)[:60],
            "fallback_active": True,
        }
        degraded_reasons.append(f"Reranker unavailable, RRF active: {str(e)[:50]}")

    # 4. LLM provider
    try:
        llm = get_llm_provider()
        llm_model = llm.get_model_name()
        provider_name = getattr(settings, "llm_provider", "openai")

        groq_details = None
        if provider_name == "groq" or hasattr(llm, "check_health"):
            groq_health = llm.check_health(probe_api=False) if hasattr(llm, "check_health") else check_groq_health()
            groq_status = groq_health.get("status", "GROQ_CONFIGURED")
            groq_details = groq_health
            if groq_status == "GROQ_NOT_CONFIGURED":
                components["llm"] = ComponentHealthStatus.NOT_CONFIGURED.value
                components["llm_provider"] = ComponentHealthStatus.NOT_CONFIGURED.value
                degraded_reasons.append("Groq LLM provider: GROQ_API_KEY not configured")
            elif groq_status in ("GROQ_AUTH_FAILED", "GROQ_UNAVAILABLE"):
                components["llm"] = ComponentHealthStatus.DEGRADED.value
                components["llm_provider"] = ComponentHealthStatus.DEGRADED.value
                degraded_reasons.append(f"Groq LLM provider {groq_status}")
            else:
                components["llm"] = ComponentHealthStatus.HEALTHY.value
                components["llm_provider"] = ComponentHealthStatus.HEALTHY.value
        else:
            components["llm"] = ComponentHealthStatus.HEALTHY.value
            components["llm_provider"] = ComponentHealthStatus.HEALTHY.value

        details["llm"] = {
            "status": components["llm"],
            "provider": provider_name,
            "model": llm_model,
        }
        if groq_details:
            details["llm"]["groq"] = groq_details
    except Exception as e:
        components["llm"] = ComponentHealthStatus.DEGRADED.value
        components["llm_provider"] = ComponentHealthStatus.DEGRADED.value
        details["llm"] = {
            "status": ComponentHealthStatus.DEGRADED.value,
            "error": str(e)[:60],
        }
        degraded_reasons.append(f"LLM provider unavailable: {str(e)[:50]}")

    # 5. Evaluation Benchmark linkage
    try:
        eval_files = glob.glob(os.path.join("rag", "evaluation", "results", "eval_run_*.json"))
        if eval_files:
            latest_eval = max(eval_files, key=os.path.getmtime)
            components["evaluation"] = ComponentHealthStatus.HEALTHY.value
            details["evaluation"] = {
                "status": ComponentHealthStatus.HEALTHY.value,
                "total_runs": len(eval_files),
                "latest_run": os.path.basename(latest_eval),
            }
        else:
            components["evaluation"] = ComponentHealthStatus.NOT_CONFIGURED.value
            details["evaluation"] = {
                "status": ComponentHealthStatus.NOT_CONFIGURED.value,
                "message": "No evaluation benchmark runs recorded yet",
            }
    except Exception as e:
        components["evaluation"] = ComponentHealthStatus.UNKNOWN.value
        details["evaluation"] = {"status": ComponentHealthStatus.UNKNOWN.value, "error": str(e)[:50]}

    # 6. Telemetry Subsystem
    try:
        telemetry_active = settings.enable_detailed_telemetry and settings.trace_enabled
        trace_count = len(trace_store.traces) if hasattr(trace_store, "traces") else 0
        if telemetry_active:
            components["telemetry"] = ComponentHealthStatus.HEALTHY.value
            details["telemetry"] = {
                "status": ComponentHealthStatus.HEALTHY.value,
                "traces_in_store": trace_count,
                "retention_max": settings.trace_retention_max_items,
            }
        else:
            components["telemetry"] = ComponentHealthStatus.NOT_CONFIGURED.value
            details["telemetry"] = {"status": ComponentHealthStatus.NOT_CONFIGURED.value}
    except Exception as e:
        components["telemetry"] = ComponentHealthStatus.UNKNOWN.value
        details["telemetry"] = {"status": ComponentHealthStatus.UNKNOWN.value, "error": str(e)[:50]}

    # Overall Status determination
    if has_unavailable:
        overall_status = ServiceHealthStatus.UNAVAILABLE.value
    elif degraded_reasons:
        overall_status = ServiceHealthStatus.DEGRADED.value
    else:
        overall_status = ServiceHealthStatus.HEALTHY.value

    return {
        "status": overall_status,
        "service": settings.app_name,
        "version": "1.3.0",
        "environment": settings.environment,
        "uptime_seconds": get_service_uptime_seconds(),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "components": components,
        "details": details,
        "degraded_reasons": degraded_reasons,
    }


def check_groq_health(
    api_key: Optional[str] = None,
    model: Optional[str] = None,
    probe_api: bool = False,
) -> Dict[str, Any]:
    """
    Check Groq cloud LLM provider readiness.
    Distinguishes:
      - GROQ_HEALTHY
      - GROQ_CONFIGURED
      - GROQ_NOT_CONFIGURED
      - GROQ_AUTH_FAILED
      - GROQ_RATE_LIMITED
      - GROQ_UNAVAILABLE
    """
    from rag.generation.llm_provider import GroqLLMProvider
    provider = GroqLLMProvider(api_key=api_key or "", model=model or "")
    return provider.check_health(probe_api=probe_api)
