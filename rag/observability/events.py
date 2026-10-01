# =============================================================================
# ELITEBUILD RAG — Observability Event Standards & Constants
# =============================================================================
# Standardizes event types, error classifications, security auditing vectors,
# and cost measurement states across the RAG observability pipeline.
# =============================================================================

from enum import Enum


class RAGEventType(str, Enum):
    """Standardized event types for structured lifecycle logging."""
    # Request lifecycle
    REQUEST_STARTED = "rag.request.started"
    REQUEST_COMPLETED = "rag.request.completed"
    REQUEST_FAILED = "rag.request.failed"

    # Authorization
    AUTHORIZATION_STARTED = "rag.authorization.started"
    AUTHORIZATION_COMPLETED = "rag.authorization.completed"

    # Retrieval pipeline
    RETRIEVAL_STARTED = "rag.retrieval.started"
    DENSE_COMPLETED = "rag.dense.completed"
    BM25_COMPLETED = "rag.bm25.completed"
    RRF_COMPLETED = "rag.rrf.completed"
    RERANKER_COMPLETED = "rag.reranker.completed"
    RETRIEVAL_COMPLETED = "rag.retrieval.completed"

    # Evidence assessment
    EVIDENCE_ASSESSED = "rag.evidence.assessed"
    CONTEXT_CONSTRUCTED = "rag.context.constructed"

    # Generation pipeline
    GENERATION_STARTED = "rag.generation.started"
    GENERATION_COMPLETED = "rag.generation.completed"

    # Citation validation
    CITATION_VALIDATION_STARTED = "rag.citation.validation.started"
    CITATION_VALIDATION_COMPLETED = "rag.citation.validation.completed"

    # Ingestion pipeline
    INGESTION_STARTED = "rag.ingestion.started"
    INGESTION_COMPLETED = "rag.ingestion.completed"
    INGESTION_FAILED = "rag.ingestion.failed"

    # Evaluation benchmark
    EVALUATION_RUN_STARTED = "rag.evaluation.run.started"
    EVALUATION_CASE_COMPLETED = "rag.evaluation.case.completed"
    EVALUATION_RUN_COMPLETED = "rag.evaluation.run.completed"


class RAGSecurityEventType(str, Enum):
    """Security audit events for authorization, boundary checks, and injection defense."""
    UNAUTHORIZED_RAG_REQUEST = "rag.security.unauthorized_request"
    UNAUTHORIZED_REQUEST = "unauthorized_rag_request"
    TENANT_ACCESS_DENIED = "tenant_access_denied"
    DOCUMENT_ACCESS_DENIED = "document_access_denied"
    INVALID_AUTH_CONTEXT = "invalid_auth_context"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    PROMPT_INJECTION_DETECTED = "prompt_injection_detected"
    CITATION_VALIDATION_FAILURE = "citation_validation_failure"


class RAGErrorCategory(str, Enum):
    """Standardized error classifications for RAG pipeline failures."""
    AUTHORIZATION_ERROR = "AUTHORIZATION_ERROR"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    RETRIEVAL_ERROR = "RETRIEVAL_ERROR"
    EMBEDDING_ERROR = "EMBEDDING_ERROR"
    RERANKER_ERROR = "RERANKER_ERROR"
    GENERATION_ERROR = "GENERATION_ERROR"
    CITATION_ERROR = "CITATION_ERROR"
    TIMEOUT = "TIMEOUT"
    RATE_LIMIT = "RATE_LIMIT"
    PROVIDER_ERROR = "PROVIDER_ERROR"
    DATABASE_ERROR = "DATABASE_ERROR"
    UNKNOWN_ERROR = "UNKNOWN_ERROR"


class GenerationStatus(str, Enum):
    """Execution status of the LLM generation phase."""
    SUCCESS = "SUCCESS"
    TIMEOUT = "TIMEOUT"
    RATE_LIMITED = "RATE_LIMITED"
    PROVIDER_ERROR = "PROVIDER_ERROR"
    VALIDATION_FAILED = "VALIDATION_FAILED"
    FALLBACK = "FALLBACK"


class MetricState(str, Enum):
    """Explicit measurement state — zero fabrication principle."""
    MEASURED = "MEASURED"
    ESTIMATED = "ESTIMATED"
    NOT_AVAILABLE = "NOT_AVAILABLE"
    NOT_IMPLEMENTED = "NOT_IMPLEMENTED"
