# =============================================================================
# ELITEBUILD RAG — Operational Alerting Framework (Step 15)
# =============================================================================
# Lightweight, thread-safe alerting engine for production monitoring.
# Generates structured events for:
#   - Latency SLA breaches (p95 latency > threshold)
#   - Error rate anomalies (failure rate > threshold)
#   - Subsystem outages (DB, Vector Store, LLM, Embedding provider)
#   - Security boundary violations (cross-tenant access, unauthorized role escalations)
#   - Quality gate failures & regressions
#   - Ingestion failures
#
# Severity: INFO | WARNING | CRITICAL
# Non-invasive: In-memory ring buffer with safe metadata (zero secrets).
# =============================================================================

import threading
import time
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

from rag.config.settings import settings


class AlertSeverity(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


class AlertType(str, Enum):
    LATENCY_SLA_BREACH = "LATENCY_SLA_BREACH"
    ERROR_RATE_HIGH = "ERROR_RATE_HIGH"
    PROVIDER_UNAVAILABLE = "PROVIDER_UNAVAILABLE"
    DATABASE_DISCONNECTED = "DATABASE_DISCONNECTED"
    SECURITY_VIOLATION = "SECURITY_VIOLATION"
    QUALITY_GATE_FAILED = "QUALITY_GATE_FAILED"
    REGRESSION_DETECTED = "REGRESSION_DETECTED"
    INGESTION_FAILURE = "INGESTION_FAILURE"
    STALE_KNOWLEDGE = "STALE_KNOWLEDGE"


class Alert:
    """Represents an operational incident or warning."""

    def __init__(
        self,
        alert_type: AlertType,
        severity: AlertSeverity,
        title: str,
        message: str,
        component: str,
        details: Optional[Dict[str, Any]] = None,
        alert_id: Optional[str] = None,
    ):
        self.alert_id = alert_id or f"alt-{uuid.uuid4().hex[:10]}"
        self.alert_type = alert_type.value if isinstance(alert_type, AlertType) else str(alert_type)
        self.severity = severity.value if isinstance(severity, AlertSeverity) else str(severity)
        self.title = title
        self.message = message
        self.component = component
        self.details = details or {}
        self.timestamp = datetime.now(timezone.utc).isoformat()
        self.acknowledged = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "alert_id": self.alert_id,
            "alert_type": self.alert_type,
            "severity": self.severity,
            "title": self.title,
            "message": self.message,
            "component": self.component,
            "details": self.details,
            "timestamp": self.timestamp,
            "acknowledged": self.acknowledged,
        }


class AlertStore:
    """Thread-safe in-memory store for active and recent operational alerts."""

    def __init__(self, max_items: int = 200):
        self._lock = threading.Lock()
        self.max_items = max_items
        self._alerts: List[Alert] = []

    def record_alert(
        self,
        alert_type: AlertType,
        severity: AlertSeverity,
        title: str,
        message: str,
        component: str,
        details: Optional[Dict[str, Any]] = None,
    ) -> Alert:
        alert = Alert(
            alert_type=alert_type,
            severity=severity,
            title=title,
            message=message,
            component=component,
            details=details,
        )
        with self._lock:
            self._alerts.insert(0, alert)
            if len(self._alerts) > self.max_items:
                self._alerts.pop()
        return alert

    def list_alerts(
        self,
        severity: Optional[str] = None,
        component: Optional[str] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        with self._lock:
            res: List[Dict[str, Any]] = []
            for a in self._alerts:
                if severity and a.severity != severity.upper():
                    continue
                if component and a.component != component:
                    continue
                res.append(a.to_dict())
                if len(res) >= limit:
                    break
            return res

    def get_summary(self) -> Dict[str, Any]:
        with self._lock:
            total = len(self._alerts)
            critical = sum(1 for a in self._alerts if a.severity == AlertSeverity.CRITICAL.value)
            warning = sum(1 for a in self._alerts if a.severity == AlertSeverity.WARNING.value)
            info = sum(1 for a in self._alerts if a.severity == AlertSeverity.INFO.value)
            return {
                "total_alerts": total,
                "critical": critical,
                "warning": warning,
                "info": info,
                "active_issues": critical + warning > 0,
            }

    def clear(self) -> None:
        with self._lock:
            self._alerts.clear()


# Global Singleton Alert Store
alert_store = AlertStore()


class AlertEvaluator:
    """
    Evaluates current system state (health, quality gates, telemetry)
    and generates alerts when operational thresholds are breached.
    """

    @staticmethod
    def evaluate_system_state(
        health_report: Optional[Dict[str, Any]] = None,
        quality_gate_report: Optional[Dict[str, Any]] = None,
        metrics_report: Optional[Dict[str, Any]] = None,
    ) -> List[Alert]:
        alerts_generated: List[Alert] = []

        # 1. Evaluate health check for component degradations or outages
        if health_report:
            components = health_report.get("components", {})
            for comp_name, status in components.items():
                if status == "UNAVAILABLE":
                    a = alert_store.record_alert(
                        alert_type=AlertType.PROVIDER_UNAVAILABLE,
                        severity=AlertSeverity.CRITICAL,
                        title=f"Subsystem Outage: {comp_name}",
                        message=f"Subsystem '{comp_name}' is UNAVAILABLE.",
                        component=comp_name,
                    )
                    alerts_generated.append(a)
                elif status == "DEGRADED":
                    a = alert_store.record_alert(
                        alert_type=AlertType.PROVIDER_UNAVAILABLE,
                        severity=AlertSeverity.WARNING,
                        title=f"Subsystem Degraded: {comp_name}",
                        message=f"Subsystem '{comp_name}' is running in DEGRADED mode.",
                        component=comp_name,
                    )
                    alerts_generated.append(a)

        # 2. Evaluate quality gates
        if quality_gate_report:
            overall = quality_gate_report.get("overall_status")
            if overall == "FAILED":
                failed_rules = [
                    r["rule"] for r in quality_gate_report.get("rule_evaluations", [])
                    if r.get("status") == "FAILED"
                ]
                a = alert_store.record_alert(
                    alert_type=AlertType.QUALITY_GATE_FAILED,
                    severity=AlertSeverity.CRITICAL,
                    title="Production Quality Gate Failure",
                    message=f"RAG system failed quality gate rules: {', '.join(failed_rules)}",
                    component="quality_gates",
                    details={"failed_rules": failed_rules},
                )
                alerts_generated.append(a)

        # 3. Evaluate operational telemetry metrics (e.g. p95 latency, error rate)
        if metrics_report:
            lat = metrics_report.get("latency_ms", {})
            p95 = lat.get("p95")
            if p95 and p95 > 2000.0:
                a = alert_store.record_alert(
                    alert_type=AlertType.LATENCY_SLA_BREACH,
                    severity=AlertSeverity.WARNING,
                    title="p95 Latency SLA Exceeded",
                    message=f"Observed p95 latency ({p95}ms) exceeds 2000ms threshold.",
                    component="performance",
                    details={"p95_ms": p95},
                )
                alerts_generated.append(a)

            err_rate = metrics_report.get("error_rate")
            if err_rate and err_rate > 0.05:
                a = alert_store.record_alert(
                    alert_type=AlertType.ERROR_RATE_HIGH,
                    severity=AlertSeverity.CRITICAL,
                    title="Request Failure Rate Anomaly",
                    message=f"Request failure rate ({err_rate*100:.1f}%) exceeds 5% threshold.",
                    component="reliability",
                    details={"error_rate": err_rate},
                )
                alerts_generated.append(a)

        return alerts_generated
