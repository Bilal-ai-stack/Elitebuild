# =============================================================================
# ELITEBUILD RAG — Distributed Tracing & Span Engine
# =============================================================================
# Implements lightweight OpenTelemetry-compatible tracing across the RAG request
# lifecycle:
#   Request -> Auth -> Dense -> BM25 -> RRF -> Reranker -> Evidence ->
#   Generation -> Citations -> Response
#
# Thread-safe in-memory TraceStore preserves recent traces and computes
# p50/p95 latency distributions and operational metrics without database load.
# =============================================================================

import math
import os
import threading
import time
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Dict, Generator, List, Optional

from rag.observability.events import (
    GenerationStatus,
    MetricState,
    RAGErrorCategory,
    RAGEventType,
)
from rag.observability.sanitizer import (
    hash_query_text,
    mask_identifier,
    sanitize_secrets_in_text,
    sanitize_telemetry_dict,
)


class Span:
    """
    An individual unit of work within a RAG request trace.
    """

    def __init__(
        self,
        name: str,
        span_id: Optional[str] = None,
        parent_span_id: Optional[str] = None,
    ):
        self.span_id = span_id or uuid.uuid4().hex[:16]
        self.parent_span_id = parent_span_id
        self.name = name
        self.start_time = time.time()
        self.end_time: Optional[float] = None
        self.duration_ms: float = 0.0
        self.attributes: Dict[str, Any] = {}
        self.events: List[Dict[str, Any]] = []
        self.status: str = "OK"  # "OK" | "ERROR"
        self.error: Optional[Dict[str, Any]] = None

    def set_attribute(self, key: str, value: Any) -> "Span":
        """Set a metadata attribute on the span."""
        if isinstance(value, str):
            self.attributes[key] = sanitize_secrets_in_text(value)
        elif isinstance(value, dict):
            self.attributes[key] = sanitize_telemetry_dict(value)
        else:
            self.attributes[key] = value
        return self

    def add_event(self, name: str, attributes: Optional[Dict[str, Any]] = None) -> "Span":
        """Record an in-span lifecycle event."""
        event_record = {
            "name": name,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "attributes": sanitize_telemetry_dict(attributes or {}),
        }
        self.events.append(event_record)
        return self

    def record_error(
        self,
        error_type: Union[str, RAGErrorCategory],
        message: str,
        component: Optional[str] = None,
    ) -> "Span":
        """Record an error in the span."""
        self.status = "ERROR"
        self.error = {
            "error_type": str(error_type),
            "message": sanitize_secrets_in_text(message),
            "component": component or self.name,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        return self

    def finish(self, status: Optional[str] = None) -> None:
        """Mark span as finished and calculate duration."""
        if self.end_time is None:
            self.end_time = time.time()
            self.duration_ms = round((self.end_time - self.start_time) * 1000, 2)
        if status:
            self.status = status

    def to_dict(self) -> Dict[str, Any]:
        """Serialize span to dictionary."""
        return {
            "span_id": self.span_id,
            "parent_span_id": self.parent_span_id,
            "name": self.name,
            "start_time": datetime.fromtimestamp(self.start_time, tz=timezone.utc).isoformat(),
            "end_time": (
                datetime.fromtimestamp(self.end_time, tz=timezone.utc).isoformat()
                if self.end_time else None
            ),
            "duration_ms": self.duration_ms,
            "status": self.status,
            "attributes": self.attributes,
            "events": self.events,
            "error": self.error,
        }


class RAGTrace:
    """
    Root trace representing the entire end-to-end lifecycle of a RAG query.
    """

    def __init__(
        self,
        trace_id: Optional[str] = None,
        request_id: Optional[str] = None,
        tenant_id: str = "elitebuild-core",
        user_role: str = "PUBLIC",
        user_id: Optional[str] = None,
        query: str = "",
        evaluation_run_id: Optional[str] = None,
        test_case_id: Optional[str] = None,
    ):
        self.trace_id = trace_id or f"trace-{uuid.uuid4().hex}"
        self.request_id = request_id or f"req-{uuid.uuid4().hex[:12]}"
        self.tenant_id = tenant_id
        self.user_role = user_role
        self.masked_user_id = mask_identifier(user_id)
        self.query_preview = sanitize_secrets_in_text(query[:120]) if query else ""
        self.query_hash = hash_query_text(query) if query else ""
        self.evaluation_run_id = evaluation_run_id
        self.test_case_id = test_case_id

        self.start_time = time.time()
        self.end_time: Optional[float] = None
        self.total_latency_ms: float = 0.0
        self.status: str = "SUCCESS"  # "SUCCESS" | "FAILED" | "DEGRADED"

        self.spans: List[Span] = []
        self._active_span: Optional[Span] = None
        self.errors: List[Dict[str, Any]] = []

        # Standardized telemetry metrics
        self.metrics: Dict[str, Any] = {
            "dense_latency_ms": 0.0,
            "bm25_latency_ms": 0.0,
            "rrf_latency_ms": 0.0,
            "reranker_latency_ms": 0.0,
            "retrieval_latency_ms": 0.0,
            "generation_latency_ms": 0.0,
            "citation_latency_ms": 0.0,
            "total_latency_ms": 0.0,
            "dense_candidate_count": 0,
            "bm25_candidate_count": 0,
            "rrf_candidate_count": 0,
            "reranked_count": 0,
            "final_evidence_count": 0,
            "input_tokens": 0,
            "output_tokens": 0,
            "total_tokens": 0,
            "estimated_cost_usd": 0.0,
            "cost_state": MetricState.NOT_AVAILABLE.value,
            "evidence_status": "UNKNOWN",
            "citation_count": 0,
            "cache_hit": False,
        }

    @contextmanager
    def span(self, name: str, attributes: Optional[Dict[str, Any]] = None) -> Generator[Span, None, None]:
        """
        Context manager to create, track, and automatically finish a child span.
        """
        parent_id = self._active_span.span_id if self._active_span else None
        span = Span(name=name, parent_span_id=parent_id)
        if attributes:
            for k, v in attributes.items():
                span.set_attribute(k, v)
        prev_active = self._active_span
        self._active_span = span
        self.spans.append(span)

        try:
            yield span
        except Exception as e:
            span.record_error(
                error_type=RAGErrorCategory.UNKNOWN_ERROR,
                message=str(e),
                component=name,
            )
            self.record_error(
                error_type=RAGErrorCategory.UNKNOWN_ERROR,
                message=str(e),
                component=name,
            )
            raise
        finally:
            span.finish()
            self._active_span = prev_active

    def record_error(
        self,
        error_type: Union[str, RAGErrorCategory],
        message: str,
        component: Optional[str] = None,
    ) -> None:
        """Record an error at the trace level."""
        self.status = "FAILED"
        error_entry = {
            "error_type": str(error_type),
            "message": sanitize_secrets_in_text(message),
            "component": component or "pipeline",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        self.errors.append(error_entry)

    def set_generation_meta(
        self,
        model: str = "",
        provider: str = "",
        input_tokens: int = 0,
        output_tokens: int = 0,
        generation_latency_ms: float = 0.0,
        generation_status: str = "SUPPORTED",
    ) -> None:
        """Record generation metadata in trace metrics."""
        self.metrics["input_tokens"] = input_tokens
        self.metrics["output_tokens"] = output_tokens
        self.metrics["total_tokens"] = input_tokens + output_tokens
        self.metrics["generation_latency_ms"] = generation_latency_ms
        self.metrics["evidence_status"] = generation_status
        self.metrics["model"] = model
        self.metrics["provider"] = provider

    def finish(self, status: Optional[str] = None) -> None:
        """Finish the trace and calculate final elapsed time."""
        if self.end_time is None:
            self.end_time = time.time()
            if self.total_latency_ms == 0.0:
                self.total_latency_ms = round((self.end_time - self.start_time) * 1000, 2)
            self.metrics["total_latency_ms"] = self.total_latency_ms
        if status:
            self.status = status
        elif self.errors and self.status == "SUCCESS":
            self.status = "FAILED"

    def end_trace(self, status: Optional[str] = None) -> None:
        """Alias for finish() for backward compatibility."""
        self.finish(status=status)

    def to_dict(self) -> Dict[str, Any]:
        """Serialize trace into structured, safe dictionary."""
        return {
            "trace_id": self.trace_id,
            "request_id": self.request_id,
            "evaluation_run_id": self.evaluation_run_id,
            "test_case_id": self.test_case_id,
            "tenant_id": self.tenant_id,
            "user_role": self.user_role,
            "masked_user": self.masked_user_id,
            "query_preview": self.query_preview,
            "query_hash": self.query_hash,
            "status": self.status,
            "start_time": datetime.fromtimestamp(self.start_time, tz=timezone.utc).isoformat(),
            "end_time": (
                datetime.fromtimestamp(self.end_time, tz=timezone.utc).isoformat()
                if self.end_time else None
            ),
            "total_latency_ms": self.total_latency_ms,
            "metrics": self.metrics,
            "errors": self.errors,
            "spans": [s.to_dict() for s in self.spans],
        }


class TraceStore:
    """
    Thread-safe in-memory ring-buffer for storing and querying traces.
    Avoids impacting primary database tables while enabling full telemetry.
    """

    def __init__(self, max_size: int = 1000):
        self.max_size = max_size
        self._traces: List[RAGTrace] = []
        self._traces_by_id: Dict[str, RAGTrace] = {}
        self._lock = threading.Lock()

    def clear(self) -> None:
        """Clear all stored traces from the buffer."""
        with self._lock:
            self._traces.clear()
            self._traces_by_id.clear()

    def record_trace(self, trace: RAGTrace) -> None:
        """Store a completed trace in the ring buffer."""
        trace.finish()
        with self._lock:
            if len(self._traces) >= self.max_size:
                oldest = self._traces.pop(0)
                self._traces_by_id.pop(oldest.trace_id, None)

            self._traces.append(trace)
            self._traces_by_id[trace.trace_id] = trace

    def get_trace(self, trace_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve full trace details by ID."""
        with self._lock:
            trace = self._traces_by_id.get(trace_id)
            return trace.to_dict() if trace else None

    def list_traces(
        self,
        tenant_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """List recent traces matching filter criteria."""
        with self._lock:
            matched = []
            for t in reversed(self._traces):
                if tenant_id and t.tenant_id != tenant_id:
                    continue
                if status and t.status != status:
                    continue
                matched.append({
                    "trace_id": t.trace_id,
                    "request_id": t.request_id,
                    "tenant_id": t.tenant_id,
                    "user_role": t.user_role,
                    "status": t.status,
                    "start_time": datetime.fromtimestamp(t.start_time, tz=timezone.utc).isoformat(),
                    "total_latency_ms": t.total_latency_ms,
                    "evidence_status": t.metrics.get("evidence_status", "UNKNOWN"),
                    "citations_count": t.metrics.get("citation_count", 0),
                    "error_count": len(t.errors),
                    "evaluation_run_id": t.evaluation_run_id,
                    "test_case_id": t.test_case_id,
                })
                if len(matched) >= limit:
                    break
            return matched

    def get_aggregate_metrics(self, window_seconds: Optional[int] = None) -> Dict[str, Any]:
        """
        Compute operational telemetry distributions (p50, p95, throughput, error rates).
        """
        now = time.time()
        with self._lock:
            traces = self._traces[:]

        if window_seconds is not None:
            traces = [t for t in traces if (now - t.start_time) <= window_seconds]

        total_requests = len(traces)
        if total_requests == 0:
            return {
                "total_requests": 0,
                "status": "NO_TELEMETRY_AVAILABLE",
                "message": "No production telemetry recorded yet.",
            }

        successful = sum(1 for t in traces if t.status == "SUCCESS")
        failed = sum(1 for t in traces if t.status == "FAILED")
        degraded = sum(1 for t in traces if t.status == "DEGRADED")

        # Latencies
        total_latencies = sorted(t.total_latency_ms for t in traces)
        retrieval_latencies = sorted(t.metrics.get("retrieval_latency_ms", 0.0) for t in traces)
        generation_latencies = sorted(t.metrics.get("generation_latency_ms", 0.0) for t in traces)

        def percentile(arr: List[float], p: float) -> Any:
            if len(arr) < 5:
                return "INSUFFICIENT_SAMPLE"
            k = (len(arr) - 1) * (p / 100.0)
            f = math.floor(k)
            c = math.ceil(k)
            if f == c:
                return round(arr[int(k)], 2)
            d0 = arr[int(f)] * (c - k)
            d1 = arr[int(c)] * (k - f)
            return round(d0 + d1, 2)

        # Status distribution
        status_dist: Dict[str, int] = {}
        for t in traces:
            ev_status = t.metrics.get("evidence_status", "UNKNOWN")
            status_dist[ev_status] = status_dist.get(ev_status, 0) + 1

        # Errors breakdown
        errors_by_category: Dict[str, int] = {}
        for t in traces:
            for err in t.errors:
                cat = err.get("error_type", "UNKNOWN_ERROR")
                errors_by_category[cat] = errors_by_category.get(cat, 0) + 1

        # Tokens & costs
        total_input_tokens = sum(t.metrics.get("input_tokens", 0) for t in traces)
        total_output_tokens = sum(t.metrics.get("output_tokens", 0) for t in traces)
        total_tokens = total_input_tokens + total_output_tokens
        total_cost = sum(t.metrics.get("estimated_cost_usd", 0.0) for t in traces)

        # Candidate & Evidence averages
        avg_candidates = sum(t.metrics.get("rrf_candidate_count", 0) for t in traces) / total_requests
        avg_evidence = sum(t.metrics.get("final_evidence_count", 0) for t in traces) / total_requests
        avg_citations = sum(t.metrics.get("citation_count", 0) for t in traces) / total_requests

        return {
            "total_requests": total_requests,
            "successful_requests": successful,
            "failed_requests": failed,
            "degraded_requests": degraded,
            "error_rate": round(failed / total_requests, 4),
            "latency_ms": {
                "total_p50": percentile(total_latencies, 50.0),
                "total_p95": percentile(total_latencies, 95.0),
                "retrieval_p50": percentile(retrieval_latencies, 50.0),
                "retrieval_p95": percentile(retrieval_latencies, 95.0),
                "generation_p50": percentile(generation_latencies, 50.0),
                "generation_p95": percentile(generation_latencies, 95.0),
            },
            "retrieval_summary": {
                "average_candidates": round(avg_candidates, 2),
                "average_evidence_chunks": round(avg_evidence, 2),
            },
            "generation_summary": {
                "total_tokens_consumed": total_tokens,
                "input_tokens": total_input_tokens,
                "output_tokens": total_output_tokens,
                "average_tokens_per_query": round(total_tokens / total_requests, 2),
                "total_cost_usd": round(total_cost, 6),
                "cost_state": MetricState.MEASURED.value if total_tokens > 0 else MetricState.ESTIMATED.value,
            },
            "evidence_status_distribution": status_dist,
            "citations_summary": {
                "total_citations": sum(t.metrics.get("citation_count", 0) for t in traces),
                "average_citations_per_query": round(avg_citations, 2),
            },
            "errors_by_category": errors_by_category,
            "cache_metrics": {
                "cache_hit_rate": MetricState.NOT_IMPLEMENTED.value,
            },
        }

    def clear(self) -> None:
        """Clear all stored traces."""
        with self._lock:
            self._traces.clear()
            self._traces_by_id.clear()


# Global trace store singleton
trace_store = TraceStore(max_size=1000)
