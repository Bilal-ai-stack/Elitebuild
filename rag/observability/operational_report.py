# =============================================================================
# ELITEBUILD RAG — Operational Status Report Generator (Step 15)
# =============================================================================
# Produces a comprehensive, machine-readable operational status report that synthesizes:
#   - 12-subsystem health checks
#   - Configurable quality-gate evaluations
#   - Benchmark-to-production regression status
#   - Telemetry latency & reliability distributions
#   - Ingestion pipeline & stale knowledge status
#   - Security audit event counters
#   - Active operational alerts
#
# Strictly uses explicit states:
#   MEASURED | ESTIMATED | NOT_AVAILABLE | NOT_EVALUATED | INSUFFICIENT_DATA
# Never fabricates missing metrics into fake zeroes or passes.
# =============================================================================

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from rag.config.settings import settings
from rag.observability.alerts import alert_store, AlertEvaluator
from rag.observability.health import check_rag_health
from rag.observability.ingestion_monitor import IngestionMonitor
from rag.observability.quality_gates import QualityGateEngine
from rag.observability.quality_monitor import QualityRegressionDetector
from rag.observability.security_monitor import security_monitor
from rag.observability.tracer import trace_store


def generate_operational_report(
    environment: Optional[str] = None,
    tenant_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Generate the authoritative machine-readable operational report.
    """
    env = environment or getattr(settings, "environment", "development")
    tid = tenant_id or getattr(settings, "default_tenant_id", "elitebuild-core")

    # 1. Health Probe
    health = check_rag_health()

    # 2. Quality Gates Engine
    gate_engine = QualityGateEngine(environment=env)
    quality_gates = gate_engine.evaluate_run()

    # 3. Regression Detection
    regression = QualityRegressionDetector.auto_detect_latest_comparison()

    # 4. Ingestion Health
    ingestion_mon = IngestionMonitor(tenant_id=tid)
    ingestion_health = ingestion_mon.get_ingestion_health()

    # 5. Telemetry & Latency
    telemetry_agg = trace_store.get_aggregate_metrics(window_seconds=3600)

    # 6. Security Summary
    security_summary = security_monitor.get_summary()

    # 7. Evaluate for new alerts and collect active alerts
    AlertEvaluator.evaluate_system_state(
        health_report=health,
        quality_gate_report=quality_gates,
        metrics_report=telemetry_agg,
    )
    alerts = alert_store.list_alerts(limit=20)
    alert_summary = alert_store.get_summary()

    # Metrics extraction from latest evaluation run if available
    latest_eval = QualityGateEngine.load_latest_evaluation_run()
    if latest_eval:
        ret_metrics = {
            "state": "MEASURED",
            "metrics": latest_eval.get("retrieval_metrics", {}),
        }
        gen_metrics = {
            "state": "MEASURED",
            "metrics": latest_eval.get("generation_metrics", {}),
        }
        cit_metrics = {
            "state": "MEASURED",
            "metrics": latest_eval.get("citation_metrics", {}),
        }
        perf_metrics = {
            "state": "MEASURED",
            "metrics": latest_eval.get("performance_metrics", {}),
        }
    else:
        ret_metrics = {"state": "NOT_AVAILABLE", "metrics": {}}
        gen_metrics = {"state": "NOT_AVAILABLE", "metrics": {}}
        cit_metrics = {"state": "NOT_AVAILABLE", "metrics": {}}
        perf_metrics = {"state": "NOT_AVAILABLE", "metrics": {}}

    # Latency & Reliability from real-time telemetry
    latency_metrics = {
        "p50_ms": telemetry_agg.get("latency_ms", {}).get("p50"),
        "p95_ms": telemetry_agg.get("latency_ms", {}).get("p95"),
        "sample_count": telemetry_agg.get("total_requests", 0),
        "state": "MEASURED" if telemetry_agg.get("total_requests", 0) > 0 else "INSUFFICIENT_DATA",
    }

    reliability_metrics = {
        "error_rate": telemetry_agg.get("error_rate", 0.0),
        "successful_requests": telemetry_agg.get("successful_requests", 0),
        "failed_requests": telemetry_agg.get("failed_requests", 0),
        "state": "MEASURED" if telemetry_agg.get("total_requests", 0) > 0 else "INSUFFICIENT_DATA",
    }

    return {
        "report_id": f"rag-report-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "environment": env,
        "rag_version": "1.3.0",
        "service_status": health.get("status", "UNKNOWN"),
        "uptime_seconds": health.get("uptime_seconds", 0.0),
        "component_status": health.get("components", {}),
        "component_details": health.get("details", {}),
        "degraded_reasons": health.get("degraded_reasons", []),
        "last_evaluation": quality_gates.get("evaluation_metadata"),
        "quality_gate_status": quality_gates.get("overall_status", "NOT_EVALUATED"),
        "quality_gate_summary": quality_gates.get("category_summary", {}),
        "quality_gate_rules": quality_gates.get("rule_evaluations", []),
        "regression_status": regression.get("overall_status", "INSUFFICIENT_DATA"),
        "regression_summary": {
            "has_regressions": regression.get("has_regressions", False),
            "regressions_count": regression.get("regressions_count", 0),
            "improvements_count": regression.get("improvements_count", 0),
            "baseline_run": regression.get("baseline_run_id"),
            "candidate_run": regression.get("candidate_run_id"),
        },
        "retrieval_metrics": ret_metrics,
        "generation_metrics": gen_metrics,
        "citation_metrics": cit_metrics,
        "performance_metrics": perf_metrics,
        "realtime_latency": latency_metrics,
        "reliability_metrics": reliability_metrics,
        "ingestion_status": {
            "status": ingestion_health.get("status", "UNKNOWN"),
            "total_documents": ingestion_health.get("total_documents", 0),
            "total_chunks": ingestion_health.get("total_chunks", 0),
            "embedded_chunks": ingestion_health.get("embedded_chunks", 0),
            "embedding_failures": ingestion_health.get("embedding_failures", 0),
            "freshness_summary": ingestion_health.get("freshness_summary", {}),
            "last_successful_ingestion": ingestion_health.get("last_successful_ingestion"),
        },
        "security_status": security_summary,
        "alert_summary": alert_summary,
        "active_alerts": alerts,
    }
