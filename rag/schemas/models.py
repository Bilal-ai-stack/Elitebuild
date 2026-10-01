"""
ELITEBUILD RAG Core Schemas & Data Contracts
Defines strict Pydantic models for documents, chunks, mandatory metadata,
citations, typed statuses, and telemetry.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# -----------------------------------------------------------------------------
# Security & Authority Enums
# -----------------------------------------------------------------------------

class SecurityAccessLevel(str, Enum):
    PUBLIC = "PUBLIC"
    AUTHENTICATED = "AUTHENTICATED"
    EDITOR = "EDITOR"
    ADMIN = "ADMIN"
    PRIVATE = "PRIVATE"


class SourceAuthority(str, Enum):
    VERIFIED_DOCUMENT = "VERIFIED_DOCUMENT"
    VERIFIED_PROJECT_RECORD = "VERIFIED_PROJECT_RECORD"
    VERIFIED_COMPANY_RECORD = "VERIFIED_COMPANY_RECORD"
    ADMIN_AUTHORED_CONTENT = "ADMIN_AUTHORED_CONTENT"
    USER_PROVIDED_CONTENT = "USER_PROVIDED_CONTENT"
    UNKNOWN = "UNKNOWN"


class TypedRagStatus(str, Enum):
    SUPPORTED = "SUPPORTED"
    PARTIALLY_SUPPORTED = "PARTIALLY_SUPPORTED"
    CONFLICTING_EVIDENCE = "CONFLICTING_EVIDENCE"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"


class UserRole(str, Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    EDITOR = "EDITOR"
    PUBLIC = "PUBLIC"


# -----------------------------------------------------------------------------
# Metadata & Document Models
# -----------------------------------------------------------------------------

class SourceLocation(BaseModel):
    section: Optional[str] = None
    page: Optional[int] = None
    paragraph: Optional[int] = None
    table_index: Optional[int] = None


class ChunkMetadata(BaseModel):
    """
    Mandatory 7-attribute metadata contract conforming to the
    Edversity AI Solutions Engineering standard.
    """
    tenant_id: str = Field(..., description="Multi-tenant isolation key")
    document_id: str = Field(..., description="Stable parent document identifier")
    version_tag: str = Field(..., description="Semantic version or revision tag")
    timestamp: datetime = Field(..., description="Creation or verification timestamp")
    security_access_level: SecurityAccessLevel = Field(..., description="Required clearance to retrieve")
    jurisdiction: str = Field(default="PK", description="Regulatory jurisdiction (e.g., PK, PK-KP, PK-ISB)")
    source_authority: SourceAuthority = Field(..., description="Evidence hierarchy tier")
    source_location: Optional[SourceLocation] = None
    content_status: str = Field(default="PUBLISHED", description="PUBLISHED | DRAFT | ARCHIVED")


class Chunk(BaseModel):
    chunk_id: str = Field(..., description="Unique chunk identifier")
    document_id: str = Field(..., description="Foreign key to parent document")
    chunk_index: int = Field(..., ge=0, description="Sequential index within document")
    chunk_text: str = Field(..., min_length=1, description="Text body of the chunk")
    metadata: ChunkMetadata
    embedding: Optional[List[float]] = None
    score: Optional[float] = None  # Populated after retrieval/rerank


class Document(BaseModel):
    document_id: str
    tenant_id: str
    title: str
    source_type: str  # PDF, DB_TABLE, DOCX, TXT
    source_reference: Optional[str] = None
    version_tag: str
    timestamp: datetime
    security_access_level: SecurityAccessLevel
    jurisdiction: str = "PK"
    source_authority: SourceAuthority
    content_status: str = "PUBLISHED"
    raw_content: Optional[str] = None
    chunks: List[Chunk] = Field(default_factory=list)


# -----------------------------------------------------------------------------
# Query & Response Contracts
# -----------------------------------------------------------------------------

class UserContext(BaseModel):
    user_id: Optional[str] = None
    role: UserRole = UserRole.PUBLIC
    permitted_security_levels: List[SecurityAccessLevel] = Field(
        default_factory=lambda: [SecurityAccessLevel.PUBLIC]
    )


class QueryOptions(BaseModel):
    top_k: int = Field(default=5, ge=1, le=20)
    min_rerank_score: float = Field(default=0.35, ge=0.0, le=1.0)
    include_citations: bool = True
    stream: bool = False


class QueryRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=1000)
    tenant_id: str = "elitebuild-core"
    user_context: UserContext = Field(default_factory=UserContext)
    options: QueryOptions = Field(default_factory=QueryOptions)


class Citation(BaseModel):
    index: int = Field(..., ge=1, description="Numeric reference bracket [1]")
    document_id: str
    chunk_id: str
    title: str
    source_authority: SourceAuthority
    location: Optional[str] = None
    version_tag: str
    snippet: str


class TelemetryRecord(BaseModel):
    request_id: str
    timestamp: datetime
    tenant_id: str
    user_role: str
    total_latency_ms: float
    retrieval_latency_ms: float
    rerank_latency_ms: float
    generation_latency_ms: float
    prompt_tokens: int
    completion_tokens: int
    estimated_cost_usd: float
    cache_hit: bool = False
    retrieved_count: int
    reranked_count: int
    citation_count: int


class QueryResponse(BaseModel):
    request_id: str
    status: TypedRagStatus
    answer: str
    citations: List[Citation] = Field(default_factory=list)
    telemetry: Optional[TelemetryRecord] = None


# -----------------------------------------------------------------------------
# Ingestion API Contracts
# -----------------------------------------------------------------------------

class IngestRequest(BaseModel):
    tenant_id: str = "elitebuild-core"
    document_id: str
    title: str
    source_type: str
    source_authority: SourceAuthority
    security_access_level: SecurityAccessLevel = SecurityAccessLevel.PUBLIC
    jurisdiction: str = "PK"
    version_tag: str = "1.0"
    raw_content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


class IngestResponse(BaseModel):
    document_id: str
    chunks_created: int
    dense_vectors_indexed: int
    sparse_tokens_indexed: int
    status: str = "INGESTION_COMPLETE"
