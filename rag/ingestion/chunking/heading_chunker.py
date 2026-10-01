# =============================================================================
# ELITEBUILD RAG — Heading-Aware Chunking Engine
# =============================================================================
# Splits normalized documents into retrieval-optimized chunks that
# preserve heading hierarchy, section context, and document provenance.
#
# Follows Step 10 Architecture:
#   - Target chunk size: 400–600 tokens (~1800–2500 chars)
#   - Overlap: 100 tokens (~400 chars)
#   - Heading preservation with ancestral path
# =============================================================================

import hashlib
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

from rag.config.settings import settings
from rag.observability.logger import get_rag_logger

logger = get_rag_logger("elitebuild.rag.chunking")


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

@dataclass
class ChunkingConfig:
    """Configurable chunking parameters per Step 10 guidelines."""
    target_chunk_chars: int = 2000       # ~500 tokens
    max_chunk_chars: int = 2500          # ~625 tokens
    min_chunk_chars: int = 200           # ~50 tokens
    overlap_chars: int = 400             # ~100 tokens
    heading_pattern: str = r"^(#{1,6})\s+(.+)$"


# ---------------------------------------------------------------------------
# Chunk Output
# ---------------------------------------------------------------------------

@dataclass
class ChunkOutput:
    """A single chunk ready for embedding and storage."""
    chunk_id: str
    document_id: str
    chunk_index: int
    chunk_text: str
    heading_path: str  # "Company Profile > Services > Civil Works"
    char_count: int
    token_estimate: int
    content_hash: str
    source_location: Optional[Dict[str, Any]] = None


# ---------------------------------------------------------------------------
# Heading-Aware Chunker
# ---------------------------------------------------------------------------

class HeadingAwareChunker:
    """
    Splits documents into chunks that respect heading structure.

    Strategy:
    1. Parse document into sections based on heading markers (# ## ###)
    2. Each section becomes a candidate chunk
    3. Merge small sections into their parent section
    4. Split large sections using sentence-boundary splitting with overlap
    5. Every chunk carries its full heading ancestry path
    """

    def __init__(self, config: Optional[ChunkingConfig] = None):
        self.config = config or ChunkingConfig()
        self._heading_re = re.compile(self.config.heading_pattern, re.MULTILINE)

    def chunk_document(
        self,
        document_id: str,
        raw_text: str,
        title: str = "",
        heading_structure: Optional[List[Dict[str, Any]]] = None,
    ) -> List[ChunkOutput]:
        """
        Split a document's raw text into heading-aware chunks.

        Args:
            document_id: Stable document identifier for chunk ID generation
            raw_text: Full text content to chunk
            title: Document title (prepended to heading path)
            heading_structure: Optional pre-parsed heading structure

        Returns:
            List of ChunkOutput instances with deterministic IDs
        """
        if not raw_text or not raw_text.strip():
            return []

        # Parse sections from the text
        sections = self._parse_sections(raw_text)

        if not sections:
            # Fallback: treat entire text as one section
            sections = [_Section(level=0, heading=title or "Content", text=raw_text.strip())]

        # Build heading ancestry for each section
        self._build_heading_paths(sections, title)

        # Generate chunks from sections
        chunks: List[ChunkOutput] = []
        chunk_index = 0

        for section in sections:
            section_text = section.full_text.strip()
            if not section_text:
                continue

            if len(section_text) <= self.config.max_chunk_chars:
                # Section fits in a single chunk
                if len(section_text) >= self.config.min_chunk_chars:
                    chunk = self._create_chunk(
                        document_id=document_id,
                        chunk_index=chunk_index,
                        text=section_text,
                        heading_path=section.heading_path,
                    )
                    chunks.append(chunk)
                    chunk_index += 1
                elif chunks:
                    # Too small — try to merge with previous chunk
                    prev = chunks[-1]
                    merged = prev.chunk_text + "\n\n" + section_text
                    if len(merged) <= self.config.max_chunk_chars:
                        chunks[-1] = self._create_chunk(
                            document_id=document_id,
                            chunk_index=prev.chunk_index,
                            text=merged,
                            heading_path=prev.heading_path,
                        )
                    else:
                        chunk = self._create_chunk(
                            document_id=document_id,
                            chunk_index=chunk_index,
                            text=section_text,
                            heading_path=section.heading_path,
                        )
                        chunks.append(chunk)
                        chunk_index += 1
                else:
                    # First chunk and it's small — include anyway
                    chunk = self._create_chunk(
                        document_id=document_id,
                        chunk_index=chunk_index,
                        text=section_text,
                        heading_path=section.heading_path,
                    )
                    chunks.append(chunk)
                    chunk_index += 1
            else:
                # Section too large — split with overlap
                sub_chunks = self._split_with_overlap(section_text)
                for sub_text in sub_chunks:
                    chunk = self._create_chunk(
                        document_id=document_id,
                        chunk_index=chunk_index,
                        text=sub_text,
                        heading_path=section.heading_path,
                    )
                    chunks.append(chunk)
                    chunk_index += 1

        logger.info(
            f"Chunked document '{document_id}': {len(chunks)} chunks from {len(raw_text)} chars",
            extra={"telemetry": {
                "event_type": "chunking_complete",
                "document_id": document_id,
                "chunk_count": len(chunks),
                "source_chars": len(raw_text),
            }}
        )
        return chunks

    # -----------------------------------------------------------------------
    # Internal: Section parsing
    # -----------------------------------------------------------------------

    def _parse_sections(self, text: str) -> List["_Section"]:
        """Parse markdown-style headings into section objects."""
        lines = text.split("\n")
        sections: List[_Section] = []
        current_section: Optional[_Section] = None

        for line in lines:
            match = self._heading_re.match(line)
            if match:
                # Save previous section
                if current_section is not None:
                    sections.append(current_section)

                level = len(match.group(1))
                heading = match.group(2).strip()
                current_section = _Section(level=level, heading=heading, text="")
            else:
                if current_section is None:
                    # Text before any heading — create implicit section
                    current_section = _Section(level=0, heading="Content", text="")
                current_section.text += line + "\n"

        if current_section is not None:
            sections.append(current_section)

        return sections

    def _build_heading_paths(self, sections: List["_Section"], doc_title: str) -> None:
        """Build full heading ancestry path for each section."""
        heading_stack: List[Tuple[int, str]] = []

        if doc_title:
            heading_stack.append((0, doc_title))

        for section in sections:
            # Pop entries from stack that are at same or lower level
            while heading_stack and heading_stack[-1][0] >= section.level and section.level > 0:
                heading_stack.pop()

            if section.level > 0:
                heading_stack.append((section.level, section.heading))

            section.heading_path = " > ".join(h[1] for h in heading_stack)

    def _split_with_overlap(self, text: str) -> List[str]:
        """Split large text into overlapping chunks at sentence boundaries."""
        # Split by sentence-ish boundaries
        raw_sentences = re.split(r'(?<=[.!?])\s+', text)
        sentences: List[str] = []
        for s in raw_sentences:
            if len(s) > self.config.target_chunk_chars:
                words = s.split()
                current_sub: List[str] = []
                current_len = 0
                for w in words:
                    if current_len + len(w) + 1 > self.config.target_chunk_chars and current_sub:
                        sentences.append(" ".join(current_sub))
                        current_sub = [w]
                        current_len = len(w)
                    else:
                        current_sub.append(w)
                        current_len += len(w) + 1
                if current_sub:
                    sentences.append(" ".join(current_sub))
            else:
                sentences.append(s)

        chunks: List[str] = []
        current_chunk = ""
        overlap_buffer = ""

        for sentence in sentences:
            candidate = current_chunk + (" " if current_chunk else "") + sentence

            if len(candidate) > self.config.target_chunk_chars and current_chunk:
                chunks.append(current_chunk.strip())
                # Keep overlap from end of current chunk
                overlap_buffer = current_chunk[-self.config.overlap_chars:] if len(current_chunk) > self.config.overlap_chars else current_chunk
                current_chunk = overlap_buffer + " " + sentence
            else:
                current_chunk = candidate

        if current_chunk.strip():
            chunks.append(current_chunk.strip())

        return chunks

    # -----------------------------------------------------------------------
    # Internal: Chunk creation
    # -----------------------------------------------------------------------

    def _create_chunk(
        self,
        document_id: str,
        chunk_index: int,
        text: str,
        heading_path: str,
    ) -> ChunkOutput:
        """Create a ChunkOutput with deterministic ID and content hash."""
        # Deterministic chunk ID based on document + index
        chunk_id = f"chk-{document_id.replace('doc-', '')}-{chunk_index:03d}"

        content_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
        char_count = len(text)
        token_estimate = char_count // 4  # Rough approximation

        return ChunkOutput(
            chunk_id=chunk_id,
            document_id=document_id,
            chunk_index=chunk_index,
            chunk_text=text,
            heading_path=heading_path,
            char_count=char_count,
            token_estimate=token_estimate,
            content_hash=content_hash,
        )


# ---------------------------------------------------------------------------
# Internal Section dataclass
# ---------------------------------------------------------------------------

@dataclass
class _Section:
    level: int
    heading: str
    text: str
    heading_path: str = ""

    @property
    def full_text(self) -> str:
        if self.heading and self.level > 0:
            prefix = "#" * self.level + " " + self.heading + "\n"
            return prefix + self.text
        return self.text
