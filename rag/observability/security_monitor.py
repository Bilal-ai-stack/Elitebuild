# =============================================================================
# ELITEBUILD RAG — Security & Prompt Injection Monitoring (Step 15)
# =============================================================================
# Monitors and audits security events:
#   - Unauthorized retrieval attempts
#   - Tenant isolation violations (cross-tenant access)
#   - RBAC & ABAC denials
#   - Prompt injection attempts detected in queries or retrieved documents
#   - Citation integrity violations
#   - Suspicious request patterns and rate-limit rejections
#
# Safe: Completely sanitized — zero API keys, secrets, passwords, or raw user PII.
# Integrates with AlertStore to raise immediate security alerts.
# =============================================================================

import threading
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

from rag.observability.alerts import AlertSeverity, AlertType, alert_store
from rag.observability.sanitizer import (
    hash_query_text,
    mask_identifier,
    sanitize_secrets_in_text,
)


class SecurityEventType(str, Enum):
    UNAUTHORIZED_RETRIEVAL = "UNAUTHORIZED_RETRIEVAL"
    TENANT_ISOLATION_VIOLATION = "TENANT_ISOLATION_VIOLATION"
    RBAC_DENIAL = "RBAC_DENIAL"
    ABAC_DENIAL = "ABAC_DENIAL"
    PROMPT_INJECTION_DETECTED = "PROMPT_INJECTION_DETECTED"
    INVALID_CITATION = "INVALID_CITATION"
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
    MALFORMED_PAYLOAD = "MALFORMED_PAYLOAD"


# Common prompt injection signatures to flag passively
_INJECTION_PATTERNS = [
    "ignore previous instructions",
    "ignore all instructions",
    "disregard previous",
    "system prompt override",
    "you are now a",
    "act as an uncensored",
    "jailbreak",
    "reveal internal instructions",
    "print your system prompt",
]


class SecurityMonitor:
    """Thread-safe security event recorder and audit log."""

    def __init__(self, max_audit_entries: int = 500):
        self._lock = threading.Lock()
        self.max_audit_entries = max_audit_entries
        self._audit_log: List[Dict[str, Any]] = []
        self._counts: Dict[str, int] = {e.value: 0 for e in SecurityEventType}

    def record_event(
        self,
        event_type: SecurityEventType,
        tenant_id: str,
        user_role: Optional[str] = None,
        user_id: Optional[str] = None,
        query_text: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        severity: AlertSeverity = AlertSeverity.WARNING,
    ) -> Dict[str, Any]:
        """
        Record a sanitized security audit event and create an alert if warranted.
        """
        ev_type_str = event_type.value if isinstance(event_type, SecurityEventType) else str(event_type)

        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event_type": ev_type_str,
            "tenant_id": mask_identifier(tenant_id or "unknown"),
            "user_role": user_role or "UNKNOWN",
            "user_id": mask_identifier(user_id) if user_id else None,
            "query_hash": hash_query_text(query_text) if query_text else None,
            "details": details or {},
        }

        with self._lock:
            self._counts[ev_type_str] = self._counts.get(ev_type_str, 0) + 1
            self._audit_log.insert(0, entry)
            if len(self._audit_log) > self.max_audit_entries:
                self._audit_log.pop()

        # Trigger alert for severe security events
        if event_type in [
            SecurityEventType.TENANT_ISOLATION_VIOLATION,
            SecurityEventType.PROMPT_INJECTION_DETECTED,
            SecurityEventType.UNAUTHORIZED_RETRIEVAL,
        ]:
            alert_store.record_alert(
                alert_type=AlertType.SECURITY_VIOLATION,
                severity=AlertSeverity.CRITICAL if event_type == SecurityEventType.TENANT_ISOLATION_VIOLATION else AlertSeverity.WARNING,
                title=f"Security Event: {ev_type_str}",
                message=f"Detected {ev_type_str} for tenant '{mask_identifier(tenant_id)}'",
                component="security",
                details=entry,
            )

        return entry

    def inspect_query_for_injection(self, query: str, tenant_id: str, user_role: str) -> bool:
        """
        Passive check for prompt injection heuristics.
        Does not mutate the query; logs an audit event if detected.
        """
        lower = query.lower()
        for pat in _INJECTION_PATTERNS:
            if pat in lower:
                self.record_event(
                    event_type=SecurityEventType.PROMPT_INJECTION_DETECTED,
                    tenant_id=tenant_id,
                    user_role=user_role,
                    query_text=query,
                    details={"matched_pattern": pat},
                    severity=AlertSeverity.WARNING,
                )
                return True
        return False

    def get_summary(self) -> Dict[str, Any]:
        with self._lock:
            total_events = sum(self._counts.values())
            return {
                "total_security_events": total_events,
                "event_counts": dict(self._counts),
                "recent_events_count": len(self._audit_log),
                "has_violations": (
                    self._counts.get(SecurityEventType.TENANT_ISOLATION_VIOLATION.value, 0) > 0
                    or self._counts.get(SecurityEventType.UNAUTHORIZED_RETRIEVAL.value, 0) > 0
                ),
            }

    def list_recent_events(self, limit: int = 50) -> List[Dict[str, Any]]:
        with self._lock:
            return list(self._audit_log[:limit])


# Global Singleton Security Monitor
security_monitor = SecurityMonitor()
