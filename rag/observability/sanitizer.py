# =============================================================================
# ELITEBUILD RAG — Observability Privacy & Secret Sanitizer
# =============================================================================
# Ensures telemetry, structured logs, and traces never leak:
# - API keys (OpenAI, Anthropic, Groq, custom service keys)
# - Database connection strings and passwords
# - Bearer tokens, session cookies, and JWT signatures
# - Personal Identifiable Information (PII) like raw emails or user identifiers
# =============================================================================

import hashlib
import re
from typing import Any, Dict, List, Optional, Union

# Common credential patterns for redacting
_SECRET_PATTERNS = [
    # OpenAI API Key: sk-... or sk-proj-...
    re.compile(r'sk-[a-zA-Z0-9_-]{20,}', re.IGNORECASE),
    # Groq API Key: gsk_...
    re.compile(r'gsk_[a-zA-Z0-9_-]{20,}', re.IGNORECASE),
    # Anthropic API Key: sk-ant-...
    re.compile(r'sk-ant-[a-zA-Z0-9_-]{20,}', re.IGNORECASE),
    # Generic Bearer token: Bearer ...
    re.compile(r'Bearer\s+[a-zA-Z0-9_\-\.]{15,}', re.IGNORECASE),
    # JWT tokens: eyJ...
    re.compile(r'eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}'),
    # Database URL with password: postgresql://user:pass@host...
    re.compile(r'postgres(ql)?://([^:]+):([^@]+)@', re.IGNORECASE),
    # Password parameters: password=... or "password": "..."
    re.compile(r'(password|secret|api_key|service_key)\s*[:=]\s*["\']?([^"\'\s&]+)["\']?', re.IGNORECASE),
]

# Sensitive keys in dictionary payloads to scrub completely
_SENSITIVE_KEYS = {
    "password",
    "password_hash",
    "secret",
    "api_key",
    "apikey",
    "service_key",
    "jwt_secret",
    "auth_token",
    "access_token",
    "refresh_token",
    "cookie",
    "authorization",
}


def sanitize_secrets_in_text(text: Optional[str]) -> str:
    """
    Replaces credentials, API keys, and connection passwords with [REDACTED].
    """
    if not text or not isinstance(text, str):
        return ""

    sanitized = text
    # Sanitize database URLs
    sanitized = re.sub(
        r'postgres(ql)?://([^:]+):([^@]+)@',
        r'postgresql://\2:[REDACTED]@',
        sanitized,
        flags=re.IGNORECASE,
    )

    # Sanitize known token formats
    for pattern in _SECRET_PATTERNS:
        sanitized = pattern.sub("[REDACTED_SECRET]", sanitized)

    return sanitized


def sanitize_telemetry_dict(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Recursively scrubs dictionary payloads so secrets are never stored in traces or logs.
    """
    clean: Dict[str, Any] = {}
    for key, value in data.items():
        k_lower = key.lower()
        if any(s in k_lower for s in _SENSITIVE_KEYS):
            clean[key] = "[REDACTED]"
        elif isinstance(value, dict):
            clean[key] = sanitize_telemetry_dict(value)
        elif isinstance(value, list):
            clean[key] = [
                sanitize_telemetry_dict(item) if isinstance(item, dict)
                else (sanitize_secrets_in_text(item) if isinstance(item, str) else item)
                for item in value
            ]
        elif isinstance(value, str):
            clean[key] = sanitize_secrets_in_text(value)
        else:
            clean[key] = value
    return clean


def mask_identifier(val: Optional[str]) -> str:
    """
    Hashes sensitive identifiers (user ID, email, IP) to protect PII in telemetry logs.
    """
    if not val:
        return "anonymous"
    return f"anon-{hashlib.sha256(val.encode()).hexdigest()[:12]}"


def hash_query_text(query: str) -> str:
    """
    Generates a deterministic SHA-256 hash for query privacy tracking.
    """
    return hashlib.sha256(query.strip().lower().encode("utf-8")).hexdigest()
