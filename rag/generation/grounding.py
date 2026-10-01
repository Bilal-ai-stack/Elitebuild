# =============================================================================
# ELITEBUILD RAG — Context Builder & Evidence Packaging
# =============================================================================
# Transforms retrieved evidence into a structured, bounded context
# for the LLM. Enforces context limits and citation ID assignment.
# =============================================================================

import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from rag.config.settings import settings
from rag.observability.logger import get_rag_logger
from rag.retrieval.engine import RetrievalResult

logger = get_rag_logger("elitebuild.rag.generation.grounding")


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

@dataclass
class ContextConfig:
    """Configurable context budget to prevent unbounded LLM input."""
    max_evidence_chunks: int = 5
    max_total_chars: int = 12000      # ~3000 tokens
    max_chunk_chars: int = 3000       # Per-chunk limit
    prefer_highest_score: bool = True  # Order by reranker/RRF score


# ---------------------------------------------------------------------------
# Evidence Block — A single packaged evidence item
# ---------------------------------------------------------------------------

@dataclass
class EvidenceBlock:
    """
    A packaged evidence item with citation ID, ready for LLM consumption.
    Does NOT expose internal DB secrets or sensitive metadata.
    """
    citation_index: int               # [1], [2], etc.
    document_id: str
    document_version: str
    chunk_id: str
    title: str
    heading_path: str
    source_authority: str
    timestamp: str
    evidence_text: str
    score: float
    reranker_score: Optional[float] = None


# ---------------------------------------------------------------------------
# Citation Registry — Internal tracking of citation → evidence mapping
# ---------------------------------------------------------------------------

@dataclass
class CitationRegistry:
    """
    Maintains the internal mapping of citation IDs to evidence sources.
    Used for post-generation citation validation.
    """
    entries: List[EvidenceBlock] = field(default_factory=list)

    def get_by_index(self, index: int) -> Optional[EvidenceBlock]:
        for entry in self.entries:
            if entry.citation_index == index:
                return entry
        return None

    def get_valid_indices(self) -> set:
        return {e.citation_index for e in self.entries}

    def get_max_index(self) -> int:
        if not self.entries:
            return 0
        return max(e.citation_index for e in self.entries)


# ---------------------------------------------------------------------------
# Context Builder
# ---------------------------------------------------------------------------

class ContextBuilder:
    """
    Builds structured evidence context for LLM consumption.

    Responsibilities:
    1. Assign deterministic citation IDs [1], [2], etc.
    2. Package evidence with metadata (no internal secrets)
    3. Enforce context budget (max chunks, max chars)
    4. Maintain citation registry for post-generation validation
    5. Format evidence within <verified_evidence> security boundary
    """

    def __init__(self, config: Optional[ContextConfig] = None):
        self.config = config or ContextConfig()

    def build_context(
        self,
        results: List[RetrievalResult],
    ) -> tuple["PackagedContext", CitationRegistry]:
        """
        Transform retrieval results into packaged LLM context.

        Returns:
            (PackagedContext, CitationRegistry) — context for LLM + citation map
        """
        # Sort by quality (prefer highest score)
        if self.config.prefer_highest_score:
            sorted_results = sorted(
                results,
                key=lambda r: r.reranker_score if r.reranker_score is not None else r.score,
                reverse=True,
            )
        else:
            sorted_results = results

        # Apply context budget
        evidence_blocks: List[EvidenceBlock] = []
        total_chars = 0

        for i, result in enumerate(sorted_results):
            if len(evidence_blocks) >= self.config.max_evidence_chunks:
                break

            # Truncate individual chunk if needed (preserving sentence boundaries)
            text = result.chunk_text
            if len(text) > self.config.max_chunk_chars:
                text = self._truncate_at_sentence(text, self.config.max_chunk_chars)

            # Check total budget
            if total_chars + len(text) > self.config.max_total_chars:
                remaining = self.config.max_total_chars - total_chars
                if remaining > 200:  # Only include if meaningfully large
                    text = self._truncate_at_sentence(text, remaining)
                else:
                    break

            citation_index = i + 1  # 1-based

            # Derive title from heading_path or document_id
            title = result.heading_path or result.document_id

            block = EvidenceBlock(
                citation_index=citation_index,
                document_id=result.document_id,
                document_version=result.document_version,
                chunk_id=result.chunk_id,
                title=title,
                heading_path=result.heading_path,
                source_authority=result.source_authority,
                timestamp=result.timestamp,
                evidence_text=text,
                score=result.score,
                reranker_score=result.reranker_score,
            )
            evidence_blocks.append(block)
            total_chars += len(text)

        # Build citation registry
        registry = CitationRegistry(entries=evidence_blocks)

        # Format the context string
        context_str = self._format_context(evidence_blocks)

        packaged = PackagedContext(
            formatted_context=context_str,
            evidence_count=len(evidence_blocks),
            total_chars=total_chars,
            evidence_blocks=evidence_blocks,
        )

        logger.info(
            f"Context built: {len(evidence_blocks)} blocks, {total_chars} chars",
            extra={"telemetry": {
                "event_type": "context_built",
                "evidence_count": len(evidence_blocks),
                "total_chars": total_chars,
            }}
        )
        return packaged, registry

    def _format_context(self, blocks: List[EvidenceBlock]) -> str:
        """Format evidence blocks into the <verified_evidence> boundary."""
        if not blocks:
            return "<verified_evidence>\nNo evidence retrieved.\n</verified_evidence>"

        parts = ["<verified_evidence>"]
        for block in blocks:
            parts.append(f"\n[{block.citation_index}] Document: {block.document_id}")
            if block.heading_path:
                parts.append(f"    Section: {block.heading_path}")
            parts.append(f"    Version: {block.document_version}")
            parts.append(f"    Source Authority: {block.source_authority}")
            if block.timestamp:
                parts.append(f"    Timestamp: {block.timestamp}")
            parts.append(f"    Evidence:")
            parts.append(f"    {block.evidence_text}")
            parts.append("")  # Blank separator

        parts.append("</verified_evidence>")
        return "\n".join(parts)

    @staticmethod
    def _truncate_at_sentence(text: str, max_chars: int) -> str:
        """Truncate text at the last sentence boundary within max_chars."""
        if len(text) <= max_chars:
            return text
        truncated = text[:max_chars]
        # Find last sentence boundary
        last_period = truncated.rfind(". ")
        if last_period > max_chars * 0.5:
            return truncated[:last_period + 1]
        return truncated.rstrip() + "…"


# ---------------------------------------------------------------------------
# Packaged Context
# ---------------------------------------------------------------------------

@dataclass
class PackagedContext:
    """The formatted evidence context ready for LLM consumption."""
    formatted_context: str
    evidence_count: int
    total_chars: int
    evidence_blocks: List[EvidenceBlock] = field(default_factory=list)
