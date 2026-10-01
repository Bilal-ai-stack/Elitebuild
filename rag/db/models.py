# =============================================================================
# ELITEBUILD RAG Service — Database Models (SQLAlchemy + pgvector)
# =============================================================================
# Defines the RAG document and chunk tables with tenant isolation,
# security access levels, and pgvector embedding storage.
# =============================================================================

import datetime
import uuid
from typing import Optional

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from rag.config.settings import settings


# ---------------------------------------------------------------------------
# Base
# ---------------------------------------------------------------------------

class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# Enums matching Step 10 contracts
# ---------------------------------------------------------------------------

SECURITY_ACCESS_LEVELS = (
    "PUBLIC", "AUTHENTICATED", "EDITOR", "ADMIN", "PRIVATE"
)

SOURCE_AUTHORITIES = (
    "VERIFIED_DOCUMENT",
    "VERIFIED_PROJECT_RECORD",
    "VERIFIED_COMPANY_RECORD",
    "ADMIN_AUTHORED_CONTENT",
    "USER_PROVIDED_CONTENT",
    "UNKNOWN",
)

INGESTION_STATUSES = (
    "PENDING",
    "IN_PROGRESS",
    "INGESTION_COMPLETE",
    "INGESTION_FAILED",
    "INGESTION_REQUIRES_EXTRACTION",
    "PARSER_ERROR",
    "EMBEDDING_ERROR",
    "VECTOR_STORE_ERROR",
    "INVALID_METADATA",
    "UNSUPPORTED_FORMAT",
    "DUPLICATE_SOURCE",
)

CONTENT_STATUSES = ("PUBLISHED", "DRAFT", "ARCHIVED")


def _generate_uuid() -> str:
    return str(uuid.uuid4())


# ---------------------------------------------------------------------------
# RAG Document
# ---------------------------------------------------------------------------

class RagDocument(Base):
    """
    Represents an ingested source document in the RAG knowledge base.
    Supports multi-tenancy, versioning, and security access control.
    """
    __tablename__ = "rag_documents"

    id: Mapped[str] = mapped_column(
        String(64), primary_key=True, default=_generate_uuid
    )
    document_id: Mapped[str] = mapped_column(
        String(255), nullable=False, index=True,
        comment="Stable semantic document identifier (e.g., doc-pec-c1-license-2024)"
    )
    tenant_id: Mapped[str] = mapped_column(
        String(128), nullable=False, index=True, default="elitebuild-core",
        comment="Multi-tenant partition key"
    )
    source_type: Mapped[str] = mapped_column(
        String(64), nullable=False,
        comment="PDF, DB_TABLE, DOCX, TXT, DB_RECORD"
    )
    source_reference: Mapped[Optional[str]] = mapped_column(
        String(512), nullable=True,
        comment="External reference (file path, table name, record ID)"
    )
    title: Mapped[str] = mapped_column(
        String(512), nullable=False, comment="Human-readable document title"
    )
    version_tag: Mapped[str] = mapped_column(
        String(64), nullable=False, default="1.0",
        comment="Semantic version tag"
    )
    timestamp: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        default=lambda: datetime.datetime.now(datetime.timezone.utc),
        comment="Document creation or verification timestamp"
    )
    security_access_level: Mapped[str] = mapped_column(
        String(32), nullable=False, default="PUBLIC",
        comment="Required clearance: PUBLIC | AUTHENTICATED | EDITOR | ADMIN | PRIVATE"
    )
    jurisdiction: Mapped[str] = mapped_column(
        String(32), nullable=False, default="PK",
        comment="Regulatory jurisdiction (PK, PK-KP, PK-ISB)"
    )
    source_authority: Mapped[str] = mapped_column(
        String(64), nullable=False, default="UNKNOWN",
        comment="Evidence hierarchy tier from Step 10"
    )
    content_hash: Mapped[Optional[str]] = mapped_column(
        String(128), nullable=True,
        comment="SHA-256 hash of normalized content for deduplication"
    )
    content_status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="PUBLISHED",
        comment="PUBLISHED | DRAFT | ARCHIVED"
    )
    ingestion_status: Mapped[str] = mapped_column(
        String(64), nullable=False, default="PENDING",
        comment="Current ingestion pipeline status"
    )
    chunk_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0,
        comment="Number of chunks generated from this document"
    )
    raw_text_length: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0,
        comment="Character length of extracted raw text"
    )
    metadata_json: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True,
        comment="Additional metadata as JSON string"
    )
    error_message: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True,
        comment="Error details if ingestion failed"
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        server_default=func.now()
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        server_default=func.now(), onupdate=func.now()
    )

    # Relationship to chunks
    chunks = relationship(
        "RagChunk", back_populates="document",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (
        UniqueConstraint(
            "tenant_id", "document_id", "version_tag",
            name="uq_rag_doc_tenant_docid_version"
        ),
        Index("ix_rag_doc_tenant_security", "tenant_id", "security_access_level"),
        Index("ix_rag_doc_content_hash", "content_hash"),
        Index("ix_rag_doc_ingestion_status", "ingestion_status"),
    )

    def __repr__(self) -> str:
        return (
            f"<RagDocument(document_id='{self.document_id}', "
            f"tenant='{self.tenant_id}', "
            f"version='{self.version_tag}', "
            f"status='{self.ingestion_status}')>"
        )


# ---------------------------------------------------------------------------
# RAG Chunk
# ---------------------------------------------------------------------------

class RagChunk(Base):
    """
    Represents an individual chunk of a document with its embedding vector.
    Carries full provenance metadata for citation traceability.
    """
    __tablename__ = "rag_chunks"

    id: Mapped[str] = mapped_column(
        String(64), primary_key=True, default=_generate_uuid
    )
    chunk_id: Mapped[str] = mapped_column(
        String(255), nullable=False, unique=True,
        comment="Deterministic chunk identifier (e.g., chk-corp-profile-001)"
    )
    document_id: Mapped[str] = mapped_column(
        String(255), nullable=False, index=True,
        comment="Foreign key to parent rag_documents.document_id"
    )
    rag_document_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("rag_documents.id", ondelete="CASCADE"),
        nullable=False, index=True,
        comment="Physical FK to rag_documents.id"
    )
    tenant_id: Mapped[str] = mapped_column(
        String(128), nullable=False, index=True, default="elitebuild-core",
        comment="Multi-tenant partition key (denormalized for pre-retrieval filtering)"
    )
    chunk_index: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0,
        comment="Sequential position within the parent document"
    )
    heading_path: Mapped[Optional[str]] = mapped_column(
        String(1024), nullable=True,
        comment="Ancestral heading hierarchy (e.g., 'Company Profile > Services > Civil Works')"
    )
    chunk_text: Mapped[str] = mapped_column(
        Text, nullable=False,
        comment="The actual text content of this chunk"
    )
    char_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0,
        comment="Character count of chunk_text"
    )
    token_estimate: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0,
        comment="Estimated token count (approx chars/4)"
    )
    embedding = mapped_column(
        Vector(settings.vector_dimension), nullable=True,
        comment=f"Dense vector embedding ({settings.vector_dimension}-dim)"
    )
    security_access_level: Mapped[str] = mapped_column(
        String(32), nullable=False, default="PUBLIC",
        comment="Inherited from parent document or overridden"
    )
    jurisdiction: Mapped[str] = mapped_column(
        String(32), nullable=False, default="PK"
    )
    source_authority: Mapped[str] = mapped_column(
        String(64), nullable=False, default="UNKNOWN"
    )
    version_tag: Mapped[str] = mapped_column(
        String(64), nullable=False, default="1.0"
    )
    timestamp: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        default=lambda: datetime.datetime.now(datetime.timezone.utc)
    )
    content_hash: Mapped[Optional[str]] = mapped_column(
        String(128), nullable=True,
        comment="SHA-256 hash of chunk_text for deduplication"
    )
    content_status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="PUBLISHED"
    )
    source_location_json: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True,
        comment="JSON with section, page, paragraph, table_index"
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        server_default=func.now()
    )

    # Relationship back to document
    document = relationship("RagDocument", back_populates="chunks")

    __table_args__ = (
        # Critical index for pre-retrieval authorization filtering
        Index(
            "ix_rag_chunk_tenant_security_status",
            "tenant_id", "security_access_level", "content_status"
        ),
        Index("ix_rag_chunk_document_id", "document_id"),
    )

    def __repr__(self) -> str:
        return (
            f"<RagChunk(chunk_id='{self.chunk_id}', "
            f"doc='{self.document_id}', "
            f"idx={self.chunk_index}, "
            f"chars={self.char_count})>"
        )
