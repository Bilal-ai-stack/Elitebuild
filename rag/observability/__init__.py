# =============================================================================
# ELITEBUILD RAG — Observability, Telemetry & Quality Monitoring Package
# =============================================================================

from rag.observability.logger import (
    get_rag_logger,
    log_rag_query_telemetry,
    StructuredJsonFormatter,
)
from rag.observability.events import (
    RAGEventType,
    RAGSecurityEventType,
    RAGErrorCategory,
    GenerationStatus,
    MetricState,
)
from rag.observability.sanitizer import (
    sanitize_secrets_in_text,
    sanitize_telemetry_dict,
    mask_identifier,
    hash_query_text,
)
from rag.observability.tracer import (
    Span,
    RAGTrace,
    TraceStore,
    trace_store,
)
from rag.observability.cost import (
    calculate_request_cost,
    estimate_tokens_from_chars,
    MODEL_PRICING,
)
from rag.observability.health import (
    ComponentHealthStatus,
    ServiceHealthStatus,
    check_liveness,
    check_readiness,
    check_rag_health,
    get_service_uptime_seconds,
)
from rag.observability.quality_monitor import (
    RegressionStatus,
    QualityRegressionDetector,
)
from rag.observability.quality_gates import (
    GateStatus,
    OverallGateStatus,
    QualityGateRule,
    QualityGateEngine,
    get_default_thresholds,
)
from rag.observability.ingestion_monitor import (
    FreshnessStatus,
    IngestionMonitor,
)
from rag.observability.alerts import (
    Alert,
    AlertSeverity,
    AlertType,
    AlertStore,
    AlertEvaluator,
    alert_store,
)
from rag.observability.security_monitor import (
    SecurityEventType,
    SecurityMonitor,
    security_monitor,
)
from rag.observability.operational_report import (
    generate_operational_report,
)

__all__ = [
    "get_rag_logger",
    "log_rag_query_telemetry",
    "StructuredJsonFormatter",
    "RAGEventType",
    "RAGSecurityEventType",
    "RAGErrorCategory",
    "GenerationStatus",
    "MetricState",
    "sanitize_secrets_in_text",
    "sanitize_telemetry_dict",
    "mask_identifier",
    "hash_query_text",
    "Span",
    "RAGTrace",
    "TraceStore",
    "trace_store",
    "calculate_request_cost",
    "estimate_tokens_from_chars",
    "MODEL_PRICING",
    "ComponentHealthStatus",
    "ServiceHealthStatus",
    "check_liveness",
    "check_readiness",
    "check_rag_health",
    "get_service_uptime_seconds",
    "RegressionStatus",
    "QualityRegressionDetector",
    "GateStatus",
    "OverallGateStatus",
    "QualityGateRule",
    "QualityGateEngine",
    "get_default_thresholds",
    "FreshnessStatus",
    "IngestionMonitor",
    "Alert",
    "AlertSeverity",
    "AlertType",
    "AlertStore",
    "AlertEvaluator",
    "alert_store",
    "SecurityEventType",
    "SecurityMonitor",
    "security_monitor",
    "generate_operational_report",
]
