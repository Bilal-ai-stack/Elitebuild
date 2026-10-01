# =============================================================================
# ELITEBUILD RAG — Ingestion Pipeline Orchestrator
# =============================================================================
# Coordinates the full ingestion workflow:
#   Source → Loader → Normalization → Chunking → Embedding → Storage
#
# Idempotent: content_hash prevents duplicate ingestion of unchanged data.
# =============================================================================

import datetime
import json
import time
from typing import Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from rag.config.settings import settings
from rag.db.models import RagChunk, RagDocument
from rag.embeddings.provider import EmbeddingProvider, get_embedding_provider
from rag.ingestion.chunking.heading_chunker import ChunkOutput, ChunkingConfig, HeadingAwareChunker
from rag.ingestion.loaders.database_loader import DatabaseRecordLoader, NormalizedDocument
from rag.observability.logger import get_rag_logger

logger = get_rag_logger("elitebuild.rag.ingestion.pipeline")


# ---------------------------------------------------------------------------
# Ingestion Status Constants
# ---------------------------------------------------------------------------

class IngestionStatus:
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETE = "INGESTION_COMPLETE"
    FAILED = "INGESTION_FAILED"
    REQUIRES_EXTRACTION = "INGESTION_REQUIRES_EXTRACTION"
    PARSER_ERROR = "PARSER_ERROR"
    EMBEDDING_ERROR = "EMBEDDING_ERROR"
    VECTOR_STORE_ERROR = "VECTOR_STORE_ERROR"
    INVALID_METADATA = "INVALID_METADATA"
    UNSUPPORTED_FORMAT = "UNSUPPORTED_FORMAT"
    DUPLICATE_SOURCE = "DUPLICATE_SOURCE"


# ---------------------------------------------------------------------------
# Ingestion Report
# ---------------------------------------------------------------------------

class IngestionReport:
    """Aggregated report of an ingestion run."""

    def __init__(self):
        self.total_sources = 0
        self.ingested = 0
        self.skipped_unchanged = 0
        self.failed = 0
        self.total_chunks = 0
        self.total_embeddings = 0
        self.errors: List[Dict] = []
        self.elapsed_ms: float = 0.0

    def summary(self) -> Dict:
        return {
            "total_sources": self.total_sources,
            "ingested": self.ingested,
            "skipped_unchanged": self.skipped_unchanged,
            "failed": self.failed,
            "total_chunks": self.total_chunks,
            "total_embeddings": self.total_embeddings,
            "error_count": len(self.errors),
            "elapsed_ms": round(self.elapsed_ms, 2),
        }


# ---------------------------------------------------------------------------
# Ingestion Pipeline
# ---------------------------------------------------------------------------

class IngestionPipeline:
    """
    Orchestrates the full RAG ingestion workflow.

    Steps:
    1. Load sources (database records, approved documents)
    2. Normalize into NormalizedDocument
    3. Check content_hash for deduplication (idempotency)
    4. Chunk using heading-aware chunker
    5. Generate embeddings
    6. Store in PostgreSQL (rag_documents + rag_chunks with pgvector)
    """

    def __init__(
        self,
        session: Session,
        embedding_provider: Optional[EmbeddingProvider] = None,
        chunking_config: Optional[ChunkingConfig] = None,
        tenant_id: str = "",
    ):
        self.session = session
        self.embedding_provider = embedding_provider or get_embedding_provider()
        self.chunker = HeadingAwareChunker(chunking_config)
        self.tenant_id = tenant_id or settings.default_tenant_id

    def ingest_from_database(self) -> IngestionReport:
        """
        Ingest all approved database records.
        Safe to call repeatedly — idempotent via content_hash comparison.
        """
        start = time.time()
        report = IngestionReport()

        logger.info(
            "Starting database ingestion",
            extra={"telemetry": {"event_type": "ingestion_start", "source": "database"}}
        )

        # Load all normalized documents from existing database
        loader = DatabaseRecordLoader(
            session=self.session,
            tenant_id=self.tenant_id,
        )
        documents = loader.load_all()
        report.total_sources = len(documents)

        # Process each document
        for doc in documents:
            try:
                result = self._ingest_document(doc)
                if result == "ingested":
                    report.ingested += 1
                elif result == "skipped":
                    report.skipped_unchanged += 1
                elif result == "failed":
                    report.failed += 1
            except Exception as e:
                report.failed += 1
                report.errors.append({
                    "document_id": doc.document_id,
                    "error": str(e),
                    "type": type(e).__name__,
                })
                logger.error(
                    f"Ingestion failed for {doc.document_id}: {e}",
                    extra={"telemetry": {
                        "event_type": "ingestion_failure",
                        "document_id": doc.document_id,
                        "error": str(e),
                    }}
                )

        self.session.commit()

        report.elapsed_ms = (time.time() - start) * 1000

        # Count totals
        report.total_chunks = self.session.query(RagChunk).filter(
            RagChunk.tenant_id == self.tenant_id
        ).count()
        report.total_embeddings = self.session.query(RagChunk).filter(
            RagChunk.tenant_id == self.tenant_id,
            RagChunk.embedding.isnot(None),
        ).count()

        logger.info(
            f"Ingestion complete: {report.summary()}",
            extra={"telemetry": {
                "event_type": "ingestion_complete",
                **report.summary(),
            }}
        )
        return report

    def ingest_single_document(self, doc: NormalizedDocument) -> str:
        """Ingest a single normalized document. Returns 'ingested', 'skipped', or 'failed'."""
        try:
            result = self._ingest_document(doc)
            self.session.commit()
            return result
        except Exception as e:
            self.session.rollback()
            logger.error(f"Single document ingestion failed for {doc.document_id}: {e}")
            raise

    # -----------------------------------------------------------------------
    # Internal: Core ingestion logic
    # -----------------------------------------------------------------------

    def _ingest_document(self, doc: NormalizedDocument) -> str:
        """
        Core ingestion logic for a single document.
        Returns 'ingested', 'skipped', or 'failed'.
        """
        # Validate metadata
        if not doc.document_id or not doc.raw_text:
            logger.warning(f"Invalid document: missing document_id or raw_text")
            return "failed"

        content_hash = doc.content_hash

        # Check for existing document with same tenant + document_id + version
        existing = self.session.query(RagDocument).filter(
            RagDocument.tenant_id == doc.tenant_id,
            RagDocument.document_id == doc.document_id,
            RagDocument.version_tag == doc.version_tag,
        ).first()

        if existing:
            # Idempotency check: skip if content unchanged
            if existing.content_hash == content_hash:
                logger.info(f"Skipping unchanged document: {doc.document_id} v{doc.version_tag}")
                return "skipped"
            else:
                # Content changed — update existing document
                logger.info(
                    f"Content changed for {doc.document_id} v{doc.version_tag}. Re-ingesting."
                )
                # Delete old chunks (cascade should handle this but be explicit)
                self.session.query(RagChunk).filter(
                    RagChunk.rag_document_id == existing.id
                ).delete()
                self.session.delete(existing)
                self.session.flush()

        # Create new RAG document record
        rag_doc = RagDocument(
            document_id=doc.document_id,
            tenant_id=doc.tenant_id,
            source_type=doc.source_type,
            source_reference=doc.source_reference,
            title=doc.title,
            version_tag=doc.version_tag,
            timestamp=doc.timestamp,
            security_access_level=doc.security_access_level,
            jurisdiction=doc.jurisdiction,
            source_authority=doc.source_authority,
            content_hash=content_hash,
            content_status=doc.content_status,
            ingestion_status=IngestionStatus.IN_PROGRESS,
            raw_text_length=len(doc.raw_text),
            metadata_json=json.dumps(doc.metadata) if doc.metadata else None,
        )
        self.session.add(rag_doc)
        self.session.flush()  # Get the auto-generated id

        try:
            # Chunk the document
            chunk_outputs = self.chunker.chunk_document(
                document_id=doc.document_id,
                raw_text=doc.raw_text,
                title=doc.title,
                heading_structure=doc.heading_structure,
            )

            if not chunk_outputs:
                rag_doc.ingestion_status = IngestionStatus.FAILED
                rag_doc.error_message = "No chunks produced from document"
                return "failed"

            # Generate embeddings in batch
            chunk_texts = [c.chunk_text for c in chunk_outputs]
            try:
                embeddings = self.embedding_provider.embed_batch(chunk_texts)
            except Exception as e:
                rag_doc.ingestion_status = IngestionStatus.EMBEDDING_ERROR
                rag_doc.error_message = f"Embedding error: {str(e)}"
                logger.error(f"Embedding failed for {doc.document_id}: {e}")
                return "failed"

            # Create chunk records with embeddings
            for i, (chunk_out, embedding) in enumerate(zip(chunk_outputs, embeddings)):
                rag_chunk = RagChunk(
                    chunk_id=chunk_out.chunk_id,
                    document_id=doc.document_id,
                    rag_document_id=rag_doc.id,
                    tenant_id=doc.tenant_id,
                    chunk_index=chunk_out.chunk_index,
                    heading_path=chunk_out.heading_path,
                    chunk_text=chunk_out.chunk_text,
                    char_count=chunk_out.char_count,
                    token_estimate=chunk_out.token_estimate,
                    embedding=embedding,
                    security_access_level=doc.security_access_level,
                    jurisdiction=doc.jurisdiction,
                    source_authority=doc.source_authority,
                    version_tag=doc.version_tag,
                    timestamp=doc.timestamp,
                    content_hash=chunk_out.content_hash,
                    content_status=doc.content_status,
                )
                self.session.add(rag_chunk)

            # Update document record
            rag_doc.chunk_count = len(chunk_outputs)
            rag_doc.ingestion_status = IngestionStatus.COMPLETE

            logger.info(
                f"Ingested {doc.document_id}: {len(chunk_outputs)} chunks, "
                f"{len(embeddings)} embeddings",
                extra={"telemetry": {
                    "event_type": "document_ingested",
                    "document_id": doc.document_id,
                    "chunk_count": len(chunk_outputs),
                    "embedding_count": len(embeddings),
                }}
            )
            return "ingested"

        except Exception as e:
            rag_doc.ingestion_status = IngestionStatus.FAILED
            rag_doc.error_message = str(e)
            logger.error(f"Ingestion pipeline error for {doc.document_id}: {e}")
            return "failed"

    # -----------------------------------------------------------------------
    # Inspection utilities
    # -----------------------------------------------------------------------

    def get_ingestion_status(self) -> Dict:
        """Return current ingestion status summary."""
        docs = self.session.query(RagDocument).filter(
            RagDocument.tenant_id == self.tenant_id
        ).all()

        status_counts: Dict[str, int] = {}
        for d in docs:
            status_counts[d.ingestion_status] = status_counts.get(d.ingestion_status, 0) + 1

        total_chunks = self.session.query(RagChunk).filter(
            RagChunk.tenant_id == self.tenant_id
        ).count()

        embedded_chunks = self.session.query(RagChunk).filter(
            RagChunk.tenant_id == self.tenant_id,
            RagChunk.embedding.isnot(None),
        ).count()

        return {
            "tenant_id": self.tenant_id,
            "total_documents": len(docs),
            "status_breakdown": status_counts,
            "total_chunks": total_chunks,
            "embedded_chunks": embedded_chunks,
            "documents": [
                {
                    "document_id": d.document_id,
                    "title": d.title,
                    "version_tag": d.version_tag,
                    "ingestion_status": d.ingestion_status,
                    "chunk_count": d.chunk_count,
                    "content_hash": d.content_hash[:12] + "..." if d.content_hash else None,
                }
                for d in docs
            ],
        }
