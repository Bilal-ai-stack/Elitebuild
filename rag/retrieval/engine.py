# =============================================================================
# ELITEBUILD RAG — Hybrid Retrieval Engine
# =============================================================================
# Implements Dense + BM25 retrieval, RRF fusion, and cross-encoder reranking.
# All retrieval enforces pre-retrieval authorization via SQL WHERE clauses.
# =============================================================================

import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set

from sqlalchemy import text as sa_text
from sqlalchemy.orm import Session

from rag.config.settings import settings
from rag.embeddings.provider import EmbeddingProvider, get_embedding_provider
from rag.observability.logger import get_rag_logger

logger = get_rag_logger("elitebuild.rag.retrieval")


# ---------------------------------------------------------------------------
# Retrieval Result Contract (Step 10 Compliant)
# ---------------------------------------------------------------------------

@dataclass
class RetrievalResult:
    """
    A single retrieved chunk with full provenance for citation traceability.
    Matches the contract defined in Step 10 / Section 18 of the requirements.
    """
    chunk_id: str
    document_id: str
    document_version: str
    score: float  # RRF or reranker score
    reranker_score: Optional[float] = None
    source_authority: str = "UNKNOWN"
    citation_reference: str = ""
    security_access_level: str = "PUBLIC"
    heading_path: str = ""
    chunk_text: str = ""
    chunk_index: int = 0
    jurisdiction: str = "PK"
    timestamp: str = ""
    content_hash: str = ""


# ---------------------------------------------------------------------------
# Retrieval Telemetry
# ---------------------------------------------------------------------------

@dataclass
class RetrievalTelemetry:
    """Performance metrics for a single retrieval request."""
    dense_latency_ms: float = 0.0
    bm25_latency_ms: float = 0.0
    rrf_latency_ms: float = 0.0
    reranker_latency_ms: float = 0.0
    retrieval_latency_ms: float = 0.0
    dense_candidate_count: int = 0
    bm25_candidate_count: int = 0
    rrf_candidate_count: int = 0
    final_result_count: int = 0


# ---------------------------------------------------------------------------
# Dense Vector Retrieval
# ---------------------------------------------------------------------------

class DenseRetriever:
    """
    Dense semantic retrieval using pgvector cosine similarity.
    Authorization filtering is applied IN the SQL query — never post-hoc.
    """

    def __init__(self, session: Session, embedding_provider: EmbeddingProvider):
        self.session = session
        self.embedding_provider = embedding_provider

    def retrieve(
        self,
        query: str,
        tenant_id: str,
        permitted_security_levels: List[str],
        top_k: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        Execute dense vector similarity search with pre-retrieval authorization.

        The WHERE clause ensures that unauthorized chunks NEVER enter memory.
        """
        start = time.time()

        # Generate query embedding
        query_vector = self.embedding_provider.embed(query)
        vector_str = "[" + ",".join(str(v) for v in query_vector) + "]"

        # Pre-retrieval authorized vector search
        # Tenant isolation + security level filtering happen BEFORE retrieval
        sql = sa_text("""
            SELECT
                chunk_id,
                document_id,
                chunk_text,
                heading_path,
                chunk_index,
                security_access_level,
                source_authority,
                version_tag,
                jurisdiction,
                timestamp,
                content_hash,
                char_count,
                1 - (embedding <=> :query_vec ::vector) AS similarity
            FROM rag_chunks
            WHERE tenant_id = :tenant_id
              AND security_access_level = ANY(:permitted_levels)
              AND content_status = 'PUBLISHED'
              AND embedding IS NOT NULL
            ORDER BY embedding <=> :query_vec ::vector
            LIMIT :top_k
        """)

        result = self.session.execute(sql, {
            "query_vec": vector_str,
            "tenant_id": tenant_id,
            "permitted_levels": permitted_security_levels,
            "top_k": top_k,
        })

        candidates = []
        for row in result.mappings():
            candidates.append({
                "chunk_id": row["chunk_id"],
                "document_id": row["document_id"],
                "chunk_text": row["chunk_text"],
                "heading_path": row.get("heading_path", ""),
                "chunk_index": row.get("chunk_index", 0),
                "security_access_level": row.get("security_access_level", "PUBLIC"),
                "source_authority": row.get("source_authority", "UNKNOWN"),
                "version_tag": row.get("version_tag", "1.0"),
                "jurisdiction": row.get("jurisdiction", "PK"),
                "timestamp": str(row.get("timestamp", "")),
                "content_hash": row.get("content_hash", ""),
                "score": float(row.get("similarity", 0.0)),
            })

        elapsed_ms = (time.time() - start) * 1000
        logger.info(
            f"Dense retrieval: {len(candidates)} candidates in {elapsed_ms:.1f}ms",
            extra={"telemetry": {
                "event_type": "dense_retrieval_complete",
                "candidate_count": len(candidates),
                "latency_ms": round(elapsed_ms, 2),
                "tenant_id": tenant_id,
            }}
        )
        return candidates


# ---------------------------------------------------------------------------
# BM25 / Lexical Retrieval (PostgreSQL Full-Text Search)
# ---------------------------------------------------------------------------

class BM25Retriever:
    """
    Sparse lexical retrieval using PostgreSQL Full-Text Search (tsvector/tsquery).
    Provides exact keyword matching for project names, PEC codes, certificate IDs.
    Authorization filtering is applied IN the SQL query.
    """

    def __init__(self, session: Session):
        self.session = session

    def retrieve(
        self,
        query: str,
        tenant_id: str,
        permitted_security_levels: List[str],
        top_k: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        Execute BM25-style lexical search with pre-retrieval authorization.
        Uses PostgreSQL ts_rank for relevance scoring.
        """
        start = time.time()

        # Build tsquery from user query (plainto_tsquery handles natural language)
        sql = sa_text("""
            SELECT
                chunk_id,
                document_id,
                chunk_text,
                heading_path,
                chunk_index,
                security_access_level,
                source_authority,
                version_tag,
                jurisdiction,
                timestamp,
                content_hash,
                char_count,
                ts_rank_cd(
                    to_tsvector('english', chunk_text),
                    plainto_tsquery('english', :query)
                ) AS rank_score
            FROM rag_chunks
            WHERE tenant_id = :tenant_id
              AND security_access_level = ANY(:permitted_levels)
              AND content_status = 'PUBLISHED'
              AND to_tsvector('english', chunk_text) @@ plainto_tsquery('english', :query)
            ORDER BY rank_score DESC
            LIMIT :top_k
        """)

        result = self.session.execute(sql, {
            "query": query,
            "tenant_id": tenant_id,
            "permitted_levels": permitted_security_levels,
            "top_k": top_k,
        })

        candidates = []
        for row in result.mappings():
            candidates.append({
                "chunk_id": row["chunk_id"],
                "document_id": row["document_id"],
                "chunk_text": row["chunk_text"],
                "heading_path": row.get("heading_path", ""),
                "chunk_index": row.get("chunk_index", 0),
                "security_access_level": row.get("security_access_level", "PUBLIC"),
                "source_authority": row.get("source_authority", "UNKNOWN"),
                "version_tag": row.get("version_tag", "1.0"),
                "jurisdiction": row.get("jurisdiction", "PK"),
                "timestamp": str(row.get("timestamp", "")),
                "content_hash": row.get("content_hash", ""),
                "score": float(row.get("rank_score", 0.0)),
            })

        elapsed_ms = (time.time() - start) * 1000
        logger.info(
            f"BM25 retrieval: {len(candidates)} candidates in {elapsed_ms:.1f}ms",
            extra={"telemetry": {
                "event_type": "bm25_retrieval_complete",
                "candidate_count": len(candidates),
                "latency_ms": round(elapsed_ms, 2),
                "tenant_id": tenant_id,
            }}
        )
        return candidates


# ---------------------------------------------------------------------------
# Reciprocal Rank Fusion (RRF)
# ---------------------------------------------------------------------------

def reciprocal_rank_fusion(
    *ranking_lists: List[Dict[str, Any]],
    k: int = 60,
) -> List[Dict[str, Any]]:
    """
    Merge multiple ranked lists using Reciprocal Rank Fusion.

    Formula: RRF(d) = Σ 1/(k + rank_m(d))

    Where:
      - k is the smoothing constant (default 60 per Step 10 architecture)
      - rank_m(d) is the 1-based rank of document d in retriever m

    Args:
        *ranking_lists: Variable number of ranked candidate lists
        k: RRF smoothing constant

    Returns:
        Merged candidates sorted by RRF score (descending)
    """
    start = time.time()
    rrf_scores: Dict[str, float] = {}
    candidates_by_id: Dict[str, Dict[str, Any]] = {}

    for ranking in ranking_lists:
        for rank_0based, candidate in enumerate(ranking):
            chunk_id = candidate["chunk_id"]
            rank_1based = rank_0based + 1
            rrf_score = 1.0 / (k + rank_1based)

            rrf_scores[chunk_id] = rrf_scores.get(chunk_id, 0.0) + rrf_score

            # Keep the candidate with the best original score
            if chunk_id not in candidates_by_id:
                candidates_by_id[chunk_id] = candidate.copy()

    # Assign RRF scores and sort
    results = []
    for chunk_id, score in rrf_scores.items():
        candidate = candidates_by_id[chunk_id].copy()
        candidate["rrf_score"] = score
        candidate["score"] = score  # Override for unified ranking
        results.append(candidate)

    results.sort(key=lambda x: x["rrf_score"], reverse=True)

    elapsed_ms = (time.time() - start) * 1000
    logger.info(
        f"RRF fusion: {len(results)} unique candidates from {len(ranking_lists)} retrievers in {elapsed_ms:.1f}ms",
        extra={"telemetry": {
            "event_type": "rrf_complete",
            "candidate_count": len(results),
            "latency_ms": round(elapsed_ms, 2),
        }}
    )
    return results


# ---------------------------------------------------------------------------
# Cross-Encoder Reranker Interface
# ---------------------------------------------------------------------------

class RerankerProvider:
    """
    Abstract reranker interface for cross-encoder reranking.
    Concrete implementations can use local models or remote APIs.
    """

    def rerank(
        self,
        query: str,
        candidates: List[Dict[str, Any]],
        top_k: int = 5,
    ) -> List[Dict[str, Any]]:
        raise NotImplementedError


class LocalCrossEncoderReranker(RerankerProvider):
    """
    Local cross-encoder reranker using sentence-transformers.
    Uses BAAI/bge-reranker-base per Step 10 architecture.

    Falls back gracefully if the model cannot be loaded (e.g., low-resource env).
    """

    def __init__(self, model_name: str = ""):
        self.model_name = model_name or settings.reranker_model
        self._model = None
        self._available = None

    def _load_model(self):
        if self._available is not None:
            return self._available

        try:
            from sentence_transformers import CrossEncoder
            self._model = CrossEncoder(self.model_name)
            self._available = True
            logger.info(f"Cross-encoder reranker loaded: {self.model_name}")
        except Exception as e:
            self._available = False
            logger.warning(
                f"Cross-encoder reranker unavailable ({self.model_name}): {e}. "
                f"Using RRF scores only. Install sentence-transformers for reranking."
            )
        return self._available

    def rerank(
        self,
        query: str,
        candidates: List[Dict[str, Any]],
        top_k: int = 5,
    ) -> List[Dict[str, Any]]:
        start = time.time()

        if not candidates:
            return []

        if not self._load_model():
            # Fallback: return candidates sorted by existing score, truncated to top_k
            logger.info("Reranker unavailable — using RRF scores as final ranking")
            return candidates[:top_k]

        # Prepare pairs for cross-encoder scoring
        pairs = [(query, c["chunk_text"]) for c in candidates]

        try:
            scores = self._model.predict(pairs)

            for i, candidate in enumerate(candidates):
                candidate["reranker_score"] = float(scores[i])

            # Sort by reranker score descending
            candidates.sort(key=lambda x: x.get("reranker_score", 0.0), reverse=True)

            # Filter by minimum score threshold
            min_score = settings.min_reranker_score
            filtered = [c for c in candidates if c.get("reranker_score", 0.0) >= min_score]

            elapsed_ms = (time.time() - start) * 1000
            logger.info(
                f"Reranking complete: {len(filtered)}/{len(candidates)} candidates above threshold {min_score} in {elapsed_ms:.1f}ms",
                extra={"telemetry": {
                    "event_type": "reranking_complete",
                    "input_count": len(candidates),
                    "output_count": len(filtered),
                    "latency_ms": round(elapsed_ms, 2),
                    "model": self.model_name,
                }}
            )
            return filtered[:top_k]

        except Exception as e:
            logger.error(f"Reranking failed: {e}. Returning RRF-ranked candidates.")
            return candidates[:top_k]


class MockReranker(RerankerProvider):
    """Mock reranker for testing — assigns deterministic scores based on position."""

    def rerank(
        self,
        query: str,
        candidates: List[Dict[str, Any]],
        top_k: int = 5,
    ) -> List[Dict[str, Any]]:
        for i, c in enumerate(candidates):
            # Deterministic score that preserves original ordering
            c["reranker_score"] = 1.0 / (i + 1)
        return candidates[:top_k]


def get_reranker(provider: str = "") -> RerankerProvider:
    """Factory function for reranker provider."""
    provider_name = provider or settings.reranker_provider
    if provider_name == "local":
        return LocalCrossEncoderReranker()
    elif provider_name == "mock":
        return MockReranker()
    else:
        return MockReranker()


# ---------------------------------------------------------------------------
# Hybrid Retrieval Engine (Orchestrator)
# ---------------------------------------------------------------------------

class HybridRetrievalEngine:
    """
    Full hybrid retrieval pipeline:
      Query → Authorization → Dense + BM25 → RRF → Cross-Encoder → Ranked Evidence

    Enforces tenant isolation and pre-retrieval security filtering at every stage.
    """

    def __init__(
        self,
        session: Session,
        embedding_provider: Optional[EmbeddingProvider] = None,
        reranker: Optional[RerankerProvider] = None,
    ):
        self.session = session
        self.embedding_provider = embedding_provider or get_embedding_provider()
        self.reranker = reranker or get_reranker()
        self.dense_retriever = DenseRetriever(session, self.embedding_provider)
        self.bm25_retriever = BM25Retriever(session)

    def retrieve(
        self,
        query: str,
        tenant_id: str = "elitebuild-core",
        user_role: str = "PUBLIC",
        permitted_security_levels: Optional[List[str]] = None,
        dense_top_k: int = 0,
        sparse_top_k: int = 0,
        final_top_k: int = 0,
        rrf_k: int = 0,
    ) -> tuple[List[RetrievalResult], RetrievalTelemetry]:
        """
        Execute full hybrid retrieval pipeline with authorization.

        Args:
            query: User's search query
            tenant_id: Tenant isolation key
            user_role: User's RBAC role
            permitted_security_levels: Allowed security levels (auto-derived from role if None)
            dense_top_k: Override for dense retrieval count
            sparse_top_k: Override for BM25 retrieval count
            final_top_k: Override for final result count
            rrf_k: Override for RRF smoothing constant

        Returns:
            (ranked_results, telemetry) tuple
        """
        total_start = time.time()
        telemetry = RetrievalTelemetry()

        # Resolve security levels from role if not explicitly provided
        if permitted_security_levels is None:
            permitted_security_levels = self._get_permitted_levels(user_role)

        # Apply defaults from settings
        dense_k = dense_top_k or settings.dense_top_k
        sparse_k = sparse_top_k or settings.sparse_top_k
        final_k = final_top_k or settings.final_top_k
        k_rrf = rrf_k or settings.rrf_k

        # 1. Dense Retrieval (pre-filtered)
        t0 = time.time()
        dense_candidates = self.dense_retriever.retrieve(
            query=query,
            tenant_id=tenant_id,
            permitted_security_levels=permitted_security_levels,
            top_k=dense_k,
        )
        telemetry.dense_latency_ms = (time.time() - t0) * 1000
        telemetry.dense_candidate_count = len(dense_candidates)

        # 2. BM25 Retrieval (pre-filtered)
        t0 = time.time()
        bm25_candidates = self.bm25_retriever.retrieve(
            query=query,
            tenant_id=tenant_id,
            permitted_security_levels=permitted_security_levels,
            top_k=sparse_k,
        )
        telemetry.bm25_latency_ms = (time.time() - t0) * 1000
        telemetry.bm25_candidate_count = len(bm25_candidates)

        # 3. RRF Fusion
        t0 = time.time()
        rrf_candidates = reciprocal_rank_fusion(
            dense_candidates, bm25_candidates, k=k_rrf
        )
        telemetry.rrf_latency_ms = (time.time() - t0) * 1000
        telemetry.rrf_candidate_count = len(rrf_candidates)

        # 4. Cross-Encoder Reranking
        t0 = time.time()
        # Take top-25 for reranking (per Step 10 architecture diagram)
        rerank_candidates = rrf_candidates[:25]
        reranked = self.reranker.rerank(
            query=query,
            candidates=rerank_candidates,
            top_k=final_k,
        )
        telemetry.reranker_latency_ms = (time.time() - t0) * 1000

        # 5. Convert to RetrievalResult contract
        results = []
        for candidate in reranked:
            results.append(RetrievalResult(
                chunk_id=candidate["chunk_id"],
                document_id=candidate["document_id"],
                document_version=candidate.get("version_tag", "1.0"),
                score=candidate.get("rrf_score", candidate.get("score", 0.0)),
                reranker_score=candidate.get("reranker_score"),
                source_authority=candidate.get("source_authority", "UNKNOWN"),
                citation_reference=candidate.get("heading_path", ""),
                security_access_level=candidate.get("security_access_level", "PUBLIC"),
                heading_path=candidate.get("heading_path", ""),
                chunk_text=candidate.get("chunk_text", ""),
                chunk_index=candidate.get("chunk_index", 0),
                jurisdiction=candidate.get("jurisdiction", "PK"),
                timestamp=candidate.get("timestamp", ""),
                content_hash=candidate.get("content_hash", ""),
            ))

        telemetry.final_result_count = len(results)
        telemetry.retrieval_latency_ms = (time.time() - total_start) * 1000

        logger.info(
            f"Hybrid retrieval complete: {len(results)} results in {telemetry.retrieval_latency_ms:.1f}ms",
            extra={"telemetry": {
                "event_type": "hybrid_retrieval_complete",
                "dense_candidates": telemetry.dense_candidate_count,
                "bm25_candidates": telemetry.bm25_candidate_count,
                "rrf_candidates": telemetry.rrf_candidate_count,
                "final_results": telemetry.final_result_count,
                "total_latency_ms": round(telemetry.retrieval_latency_ms, 2),
                "tenant_id": tenant_id,
                "user_role": user_role,
            }}
        )
        return results, telemetry

    @staticmethod
    def _get_permitted_levels(role: str) -> List[str]:
        """
        Map ELITEBUILD user roles to permitted security levels.
        Matches the RBAC mapping in RAG_SECURITY.md Section 2.
        """
        role_map = {
            "SUPER_ADMIN": ["PUBLIC", "AUTHENTICATED", "EDITOR", "ADMIN", "PRIVATE"],
            "ADMIN": ["PUBLIC", "AUTHENTICATED", "EDITOR", "ADMIN"],
            "EDITOR": ["PUBLIC", "AUTHENTICATED", "EDITOR"],
            "PUBLIC": ["PUBLIC"],
        }
        return role_map.get(role, ["PUBLIC"])
