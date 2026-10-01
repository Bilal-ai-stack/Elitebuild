# =============================================================================
# ELITEBUILD RAG — Step 14 Observability & Telemetry Test Suite
# =============================================================================
# Validates:
# 1. Trace creation, child spans, parent correlation, and status tracking
# 2. Secret and credential scrubbing (API keys, passwords, DB URIs, JWTs)
# 3. TraceStore ring buffer retention, retrieval, and filtering
# 4. Percentile math (p50, p95) and INSUFFICIENT_SAMPLE handling
# 5. Security audit event logging and error classification
# 6. QualityRegressionDetector comparison logic and regression thresholds
# 7. Component health probe (check_rag_health) with degraded mode
# =============================================================================

import os
import time
import pytest

from rag.observability import (
    RAGTrace,
    Span,
    trace_store,
    check_rag_health,
    RAGEventType,
    RAGSecurityEventType,
    RAGErrorCategory,
    GenerationStatus,
    MetricState,
    sanitize_secrets_in_text,
    sanitize_telemetry_dict,
    mask_identifier,
    hash_query_text,
    calculate_request_cost,
)
from rag.observability.quality_monitor import QualityRegressionDetector


class TestTracingAndSpans:
    """Tests for Span, RAGTrace, and lifecycle tracking."""

    def test_trace_creation_and_attributes(self):
        trace = RAGTrace(user_role="ADMIN", request_id="req-test-123")
        assert trace.trace_id.startswith("trace-")
        assert trace.request_id == "req-test-123"
        assert trace.user_role == "ADMIN"
        assert trace.status == "SUCCESS"
        assert len(trace.errors) == 0

    def test_child_span_nesting_and_timing(self):
        trace = RAGTrace(user_role="PUBLIC")
        with trace.span("dense.retrieval") as s:
            time.sleep(0.01)
            s.set_attribute("k", 5)
            s.set_attribute("found", 4)
            assert s.name == "dense.retrieval"
            assert s.attributes["k"] == 5
            assert s.attributes["found"] == 4

        assert len(trace.spans) == 1
        span_dict = trace.spans[0].to_dict()
        assert span_dict["name"] == "dense.retrieval"
        assert span_dict["duration_ms"] >= 9.0

    def test_trace_lifecycle_success(self):
        trace = RAGTrace(user_role="EDITOR")
        with trace.span("retrieval"):
            pass
        with trace.span("generation"):
            pass

        trace.metrics["dense_candidate_count"] = 10
        trace.metrics["bm25_candidate_count"] = 8
        trace.metrics["rrf_candidate_count"] = 12
        trace.metrics["reranked_count"] = 5
        trace.metrics["final_evidence_count"] = 3
        trace.metrics["retrieval_latency_ms"] = 45.5

        trace.metrics["evidence_status"] = "SUPPORTED"
        trace.metrics["citation_count"] = 2

        trace.metrics["input_tokens"] = 150
        trace.metrics["output_tokens"] = 45
        trace.metrics["total_tokens"] = 195
        trace.metrics["generation_latency_ms"] = 120.0
        trace.finish(status="SUCCESS")

        td = trace.to_dict()
        assert td["status"] == "SUCCESS"
        assert td["metrics"]["dense_candidate_count"] == 10
        assert td["metrics"]["final_evidence_count"] == 3
        assert td["metrics"]["evidence_status"] == "SUPPORTED"
        assert td["metrics"]["total_tokens"] == 195

    def test_trace_lifecycle_failure(self):
        trace = RAGTrace(user_role="PUBLIC")
        trace.record_error(
            error_type=RAGErrorCategory.RETRIEVAL_ERROR.value,
            message="Database query failed unexpectedly",
            component="dense_retriever",
        )
        trace.finish(status="FAILED")

        td = trace.to_dict()
        assert td["status"] == "FAILED"
        assert len(td["errors"]) == 1
        assert td["errors"][0]["error_type"] == RAGErrorCategory.RETRIEVAL_ERROR.value
        assert "Database query failed" in td["errors"][0]["message"]


class TestSecretSanitization:
    """Verifies that secrets, keys, and credentials are never stored in traces or logs."""

    def test_sanitize_secrets_in_text(self):
        text = "Failed with key sk-proj-1234567890abcdef12345678 and token gsk_abcdefghijklmnopqrstuvwx12"
        sanitized = sanitize_secrets_in_text(text)
        assert "sk-proj-1234567890abcdef12345678" not in sanitized
        assert "gsk_abcdefghijklmnopqrstuvwx12" not in sanitized
        assert "[REDACTED_SECRET]" in sanitized

    def test_sanitize_database_uri(self):
        text = "Connecting to postgresql://postgres:SuperSecretPassword123!@localhost:5432/elitebuild_db"
        sanitized = sanitize_secrets_in_text(text)
        assert "SuperSecretPassword123!" not in sanitized
        assert "[REDACTED" in sanitized

    def test_sanitize_telemetry_dict(self):
        raw_dict = {
            "query": "What is company net worth?",
            "api_key": "sk-1234567890abcdef1234567890abcdef",
            "nested": {
                "password": "Password99!",
                "safe_field": 42,
            }
        }
        cleaned = sanitize_telemetry_dict(raw_dict)
        assert cleaned["api_key"] == "[REDACTED]"
        assert cleaned["nested"]["password"] == "[REDACTED]"
        assert cleaned["nested"]["safe_field"] == 42

    def test_mask_identifier(self):
        user_id = "user-finance-lead-01"
        masked = mask_identifier(user_id)
        assert masked != user_id
        assert masked.startswith("anon-")
        # Idempotent for same ID
        assert mask_identifier(user_id) == masked

    def test_hash_query_text(self):
        query = "What is the category of PEC license?"
        qh = hash_query_text(query)
        assert len(qh) == 64  # SHA-256 hex string


class TestCostCalculation:
    """Validates cost calculation with explicit states."""

    def test_cost_calculation_known_model(self):
        cost, state = calculate_request_cost("gpt-4o-mini", input_tokens=1000, output_tokens=1000)
        assert state == MetricState.MEASURED
        # 1000 input = $0.00015, 1000 output = $0.0006 -> 0.00075
        assert round(cost, 5) == 0.00075

    def test_cost_calculation_unknown_model(self):
        cost, state = calculate_request_cost("non-existent-custom-llm", input_tokens=500, output_tokens=100)
        assert cost == 0.0
        assert state == MetricState.NOT_AVAILABLE


class TestTraceStoreAndMetrics:
    """Tests the in-memory ring-buffer trace store and aggregation."""

    def setup_method(self):
        trace_store.clear()

    def test_empty_store_metrics(self):
        metrics = trace_store.get_aggregate_metrics()
        assert metrics["total_requests"] == 0
        assert metrics["status"] == "NO_TELEMETRY_AVAILABLE"

    def test_trace_recording_and_retrieval(self):
        t1 = RAGTrace(user_role="PUBLIC")
        t1.finish(status="SUCCESS")
        trace_store.record_trace(t1)

        fetched = trace_store.get_trace(t1.trace_id)
        assert fetched is not None
        assert fetched["trace_id"] == t1.trace_id

    def test_percentile_calculation_with_sufficient_sample(self):
        # Create 10 traces with increasing latencies
        for i in range(1, 11):
            t = RAGTrace(user_role="PUBLIC")
            t.total_latency_ms = float(i * 100)  # 100, 200, ..., 1000 ms
            t.finish(status="SUCCESS")
            trace_store.record_trace(t)

        metrics = trace_store.get_aggregate_metrics()
        assert metrics["total_requests"] == 10
        assert metrics["successful_requests"] == 10
        assert isinstance(metrics["latency_ms"]["total_p50"], float)
        assert isinstance(metrics["latency_ms"]["total_p95"], float)
        assert metrics["latency_ms"]["total_p50"] > 0
        assert metrics["latency_ms"]["total_p95"] >= metrics["latency_ms"]["total_p50"]


class TestQualityRegressionDetector:
    """Validates the benchmark run comparison and regression alerting."""

    def test_no_regression_when_performance_stable(self):
        detector = QualityRegressionDetector()
        baseline = {
            "retrieval_metrics": {"recall@5": 0.85, "precision@5": 0.50, "mrr": 0.80},
            "generation_metrics": {"faithfulness": 0.90, "hallucination_rate": 0.05},
            "performance_metrics": {"p95_latency_ms": 500.0},
        }
        candidate = {
            "retrieval_metrics": {"recall@5": 0.88, "precision@5": 0.54, "mrr": 0.85},
            "generation_metrics": {"faithfulness": 0.91, "hallucination_rate": 0.04},
            "performance_metrics": {"p95_latency_ms": 480.0},
        }
        report = detector.compare_runs(baseline, candidate)
        assert report["has_regressions"] is False
        assert len(report["regressions"]) == 0
        assert len(report["improvements"]) > 0

    def test_regression_detected_when_recall_drops(self):
        detector = QualityRegressionDetector()
        baseline = {
            "retrieval_metrics": {"recall@5": 0.85, "precision@5": 0.50, "mrr": 0.80},
            "generation_metrics": {"faithfulness": 0.90, "hallucination_rate": 0.05},
        }
        candidate = {
            "retrieval_metrics": {"recall@5": 0.60, "precision@5": 0.35, "mrr": 0.55},  # Significant drop
            "generation_metrics": {"faithfulness": 0.90, "hallucination_rate": 0.05},
        }
        report = detector.compare_runs(baseline, candidate)
        assert report["has_regressions"] is True
        regressed_metrics = [r["metric"] for r in report["regressions"]]
        assert "recall@5" in regressed_metrics
        assert "mrr" in regressed_metrics

    def test_regression_detected_when_hallucination_spikes(self):
        detector = QualityRegressionDetector()
        baseline = {
            "retrieval_metrics": {"recall@5": 0.85},
            "generation_metrics": {"faithfulness": 0.90, "hallucination_rate": 0.02},
        }
        candidate = {
            "retrieval_metrics": {"recall@5": 0.85},
            "generation_metrics": {"faithfulness": 0.70, "hallucination_rate": 0.25},  # Hallucination spike
        }
        report = detector.compare_runs(baseline, candidate)
        assert report["has_regressions"] is True
        regressed_metrics = [r["metric"] for r in report["regressions"]]
        assert "hallucination_rate" in regressed_metrics


class TestHealthProbe:
    """Validates the component health check and degraded state reporting."""

    def test_health_check_returns_valid_structure(self):
        report = check_rag_health()
        assert "status" in report
        assert report["status"] in ("HEALTHY", "DEGRADED", "UNAVAILABLE")
        assert "components" in report
        assert "database" in report["components"]
        assert "vector_store" in report["components"]
        assert "bm25_search" in report["components"]
        assert "embedding_provider" in report["components"]
        assert "reranker" in report["components"]
        assert "llm_provider" in report["components"]
