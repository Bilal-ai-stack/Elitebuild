"""
ELITEBUILD RAG Structured Observability & Tracing Logger
Emits JSON formatted logs for RAG query lifecycles, retrieval metrics,
token expenditure, and security audit trails.
"""

import hashlib
import json
import logging
import sys
from datetime import datetime, timezone
from typing import Any, Dict, Optional


class StructuredJsonFormatter(logging.Formatter):
    """
    Formats log records into single-line JSON objects conforming to
    production cloud observability standards.
    """

    def format(self, record: logging.LogRecord) -> str:
        log_payload: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Include custom telemetry fields if present
        if hasattr(record, "telemetry") and isinstance(record.telemetry, dict):
            log_payload["telemetry"] = record.telemetry

        if record.exc_info:
            log_payload["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_payload, default=str)


def get_rag_logger(name: str = "elitebuild.rag") -> logging.Logger:
    """
    Returns configured structured logger instance.
    """
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(StructuredJsonFormatter())
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
        logger.propagate = False
    return logger


def mask_identifier(val: Optional[str]) -> str:
    """
    Hashes sensitive identifiers (such as user emails or IPs)
    to protect PII in telemetry logs.
    """
    if not val:
        return "anonymous"
    return f"anon-{hashlib.sha256(val.encode()).hexdigest()[:12]}"


def log_rag_query_telemetry(
    logger: logging.Logger,
    request_id: str,
    tenant_id: str,
    user_id: Optional[str],
    user_role: str,
    query_text: str,
    status: str,
    total_latency_ms: float,
    retrieval_latency_ms: float,
    rerank_latency_ms: float,
    generation_latency_ms: float,
    prompt_tokens: int,
    completion_tokens: int,
    cost_usd: float,
    retrieved_count: int,
    reranked_count: int,
    citation_count: int,
    cache_hit: bool = False,
) -> None:
    """
    Emits comprehensive query lifecycle telemetry record.
    """
    telemetry_data = {
        "event_type": "rag_query_completed",
        "request_id": request_id,
        "tenant_id": tenant_id,
        "masked_user": mask_identifier(user_id),
        "user_role": user_role,
        "query_length": len(query_text),
        "rag_status": status,
        "latency": {
            "total_ms": round(total_latency_ms, 2),
            "retrieval_ms": round(retrieval_latency_ms, 2),
            "rerank_ms": round(rerank_latency_ms, 2),
            "generation_ms": round(generation_latency_ms, 2),
        },
        "tokens": {
            "prompt": prompt_tokens,
            "completion": completion_tokens,
            "total": prompt_tokens + completion_tokens,
        },
        "estimated_cost_usd": round(cost_usd, 6),
        "counts": {
            "retrieved_candidates": retrieved_count,
            "reranked_candidates": reranked_count,
            "final_citations": citation_count,
        },
        "cache_hit": cache_hit,
    }

    logger.info(
        f"RAG query {request_id} finished with status {status} in {total_latency_ms:.1f}ms",
        extra={"telemetry": telemetry_data},
    )
