# =============================================================================
# ELITEBUILD RAG — Ingestion Health & Stale Knowledge Monitor (Step 15)
# =============================================================================
# Monitors the operational health of the RAG ingestion pipeline:
#   - Document discovery, acceptance, rejection, and deduplication
#   - Chunk counts and embedding generation success/failure rates
#   - Provenance tracking (tenant_id, security_access_level, authority, hash)
#   - Stale knowledge detection (CURRENT, STALE, UNKNOWN)
#
# Idempotent: Checks SHA-256 content hashes to avoid duplicating unchanged docs.
# Freshness: Evaluates expiration without inventing arbitrary dates.
# =============================================================================

from datetime import datetime, timezone, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from rag.config.settings import settings


class FreshnessStatus(str, Enum):
    CURRENT = "CURRENT"
    STALE = "STALE"
    UNKNOWN = "UNKNOWN"


# Configurable staleness thresholds by authority or source type (in days)
DEFAULT_FRESHNESS_POLICIES = {
    "VERIFIED_DOCUMENT": 365,          # PEC license, statutory corporate certificates: 1 year
    "VERIFIED_PROJECT_RECORD": 730,    # Project completion certificates: 2 years
    "VERIFIED_COMPANY_RECORD": 365,    # Corporate profile: 1 year
    "ADMIN_AUTHORED_CONTENT": 180,     # Web / admin authored FAQs & capabilities: 6 months
}


class IngestionMonitor:
    """
    Analyzes PostgreSQL RAG tables to assess ingestion pipeline health,
    deduplication efficiency, and knowledge base freshness.
    """

    def __init__(self, session: Optional[Session] = None, tenant_id: Optional[str] = None):
        self.session = session
        self.tenant_id = tenant_id or settings.default_tenant_id

    def assess_freshness(
        self,
        doc_timestamp: Optional[datetime],
        source_authority: str,
        source_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Evaluate document freshness based on known authority policies.
        If no explicit rule or timestamp exists, strictly returns UNKNOWN.
        """
        if not doc_timestamp:
            return {
                "status": FreshnessStatus.UNKNOWN.value,
                "reason": "Document has no recorded timestamp",
                "days_old": None,
            }

        policy_days = DEFAULT_FRESHNESS_POLICIES.get(source_authority)
        if not policy_days:
            return {
                "status": FreshnessStatus.UNKNOWN.value,
                "reason": f"No freshness policy configured for source authority '{source_authority}'",
                "days_old": None,
            }

        # Calculate age in days
        now = datetime.now(timezone.utc)
        if doc_timestamp.tzinfo is None:
            doc_ts = doc_timestamp.replace(tzinfo=timezone.utc)
        else:
            doc_ts = doc_timestamp

        age_days = (now - doc_ts).days
        if age_days < 0:
            return {
                "status": FreshnessStatus.CURRENT.value,
                "reason": "Document timestamp is current or in the future",
                "days_old": 0,
            }

        if age_days > policy_days:
            return {
                "status": FreshnessStatus.STALE.value,
                "reason": f"Document age ({age_days}d) exceeds freshness policy threshold ({policy_days}d)",
                "days_old": age_days,
            }

        return {
            "status": FreshnessStatus.CURRENT.value,
            "reason": f"Document is current ({age_days}d old, limit {policy_days}d)",
            "days_old": age_days,
        }

    def get_ingestion_health(self) -> Dict[str, Any]:
        """
        Gathers comprehensive ingestion pipeline metrics from the database.
        """
        from rag.db.session import get_engine, get_session
        from rag.db.models import RagDocument, RagChunk

        session_created = False
        session = self.session
        if session is None:
            try:
                engine = get_engine()
                session = get_session(engine)
                session_created = True
            except Exception as e:
                return {
                    "status": "UNAVAILABLE",
                    "error": f"Database unavailable: {str(e)[:60]}",
                    "total_documents": 0,
                    "total_chunks": 0,
                    "stale_documents": 0,
                    "fresh_documents": 0,
                    "unknown_freshness": 0,
                    "inventory": [],
                }

        try:
            query = session.query(RagDocument)
            if self.tenant_id:
                query = query.filter(RagDocument.tenant_id == self.tenant_id)
            docs = query.order_by(RagDocument.updated_at.desc()).all()

            total_chunks = session.query(RagChunk)
            if self.tenant_id:
                total_chunks = total_chunks.filter(RagChunk.tenant_id == self.tenant_id)
            chunk_count = total_chunks.count()

            # Chunks with embeddings
            embedded_chunks = total_chunks.filter(RagChunk.embedding.isnot(None)).count()
            embedding_failures = chunk_count - embedded_chunks

            # Inventory and freshness stats
            inventory: List[Dict[str, Any]] = []
            stale_count = 0
            current_count = 0
            unknown_count = 0

            last_success: Optional[str] = None
            last_failed: Optional[str] = None

            status_breakdown: Dict[str, int] = {}
            for d in docs:
                status_breakdown[d.ingestion_status] = status_breakdown.get(d.ingestion_status, 0) + 1
                if d.ingestion_status == "INGESTION_COMPLETE" and not last_success:
                    last_success = d.updated_at.isoformat() if d.updated_at else None
                elif d.ingestion_status in ["INGESTION_FAILED", "EMBEDDING_ERROR", "PARSER_ERROR"] and not last_failed:
                    last_failed = d.updated_at.isoformat() if d.updated_at else None

                fresh = self.assess_freshness(d.timestamp, d.source_authority, d.source_type)
                if fresh["status"] == FreshnessStatus.STALE.value:
                    stale_count += 1
                elif fresh["status"] == FreshnessStatus.CURRENT.value:
                    current_count += 1
                else:
                    unknown_count += 1

                inventory.append({
                    "document_id": d.document_id,
                    "title": d.title,
                    "version_tag": d.version_tag,
                    "tenant_id": d.tenant_id,
                    "security_access_level": d.security_access_level,
                    "source_authority": d.source_authority,
                    "source_type": d.source_type,
                    "content_hash": d.content_hash[:16] + "..." if d.content_hash else None,
                    "ingestion_status": d.ingestion_status,
                    "chunk_count": d.chunk_count,
                    "timestamp": d.timestamp.isoformat() if d.timestamp else None,
                    "freshness_status": fresh["status"],
                    "freshness_reason": fresh["reason"],
                    "days_old": fresh["days_old"],
                })

            health_status = "HEALTHY"
            if embedding_failures > 0 or status_breakdown.get("INGESTION_FAILED", 0) > 0:
                health_status = "DEGRADED"

            return {
                "status": health_status,
                "tenant_id": self.tenant_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "total_documents": len(docs),
                "total_chunks": chunk_count,
                "embedded_chunks": embedded_chunks,
                "embedding_failures": embedding_failures,
                "status_breakdown": status_breakdown,
                "freshness_summary": {
                    "current": current_count,
                    "stale": stale_count,
                    "unknown": unknown_count,
                },
                "last_successful_ingestion": last_success,
                "last_failed_ingestion": last_failed,
                "inventory": inventory,
            }

        finally:
            if session_created and session:
                session.close()
