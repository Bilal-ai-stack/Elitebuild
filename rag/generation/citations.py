# =============================================================================
# ELITEBUILD RAG — Citation Validation Engine
# =============================================================================
# Post-generation validation ensuring every citation in the LLM answer
# maps to a real retrieved evidence block. Invalid citations are stripped.
# =============================================================================

import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple

from rag.generation.grounding import CitationRegistry, EvidenceBlock
from rag.observability.logger import get_rag_logger

logger = get_rag_logger("elitebuild.rag.generation.citations")


# ---------------------------------------------------------------------------
# Citation Validation Result
# ---------------------------------------------------------------------------

@dataclass
class CitationValidationResult:
    """Result of post-generation citation validation."""
    original_answer: str
    validated_answer: str
    valid_citations: List[int]
    invalid_citations: List[int]
    uncited_claims_detected: bool
    all_valid: bool


# ---------------------------------------------------------------------------
# Citation Validator
# ---------------------------------------------------------------------------

class CitationValidator:
    """
    Validates and sanitizes citations in LLM-generated answers.

    Responsibilities:
    1. Extract all [N] citations from the generated text
    2. Verify each citation maps to a real evidence block
    3. Remove/flag invalid citations
    4. Produce a validated answer with only legitimate citations
    """

    # Regex for [1], [2], etc.
    CITATION_PATTERN = re.compile(r'\[(\d+)\]')

    def validate(
        self,
        answer: str,
        registry: CitationRegistry,
    ) -> CitationValidationResult:
        """
        Validate all citations in the answer against the evidence registry.

        Args:
            answer: The LLM-generated answer text
            registry: The citation registry from context building

        Returns:
            CitationValidationResult with validated answer and diagnostics
        """
        if not answer:
            return CitationValidationResult(
                original_answer="",
                validated_answer="",
                valid_citations=[],
                invalid_citations=[],
                uncited_claims_detected=False,
                all_valid=True,
            )

        valid_indices = registry.get_valid_indices()
        found_citations = self._extract_citations(answer)

        valid_found: List[int] = []
        invalid_found: List[int] = []

        for idx in found_citations:
            if idx in valid_indices:
                valid_found.append(idx)
            else:
                invalid_found.append(idx)

        # Strip invalid citations from the answer
        validated_answer = answer
        if invalid_found:
            for bad_idx in invalid_found:
                # Remove the invalid citation bracket
                validated_answer = validated_answer.replace(f"[{bad_idx}]", "")
            # Clean up double spaces left by removal
            validated_answer = re.sub(r'  +', ' ', validated_answer).strip()

            logger.warning(
                f"Removed {len(invalid_found)} invalid citations: {invalid_found}",
                extra={"telemetry": {
                    "event_type": "citation_validation_warning",
                    "invalid_citations": invalid_found,
                    "valid_citations": valid_found,
                }}
            )

        all_valid = len(invalid_found) == 0

        result = CitationValidationResult(
            original_answer=answer,
            validated_answer=validated_answer,
            valid_citations=sorted(set(valid_found)),
            invalid_citations=sorted(set(invalid_found)),
            uncited_claims_detected=False,  # Conservative — would require claim detection
            all_valid=all_valid,
        )

        logger.info(
            f"Citation validation: {len(valid_found)} valid, {len(invalid_found)} invalid",
            extra={"telemetry": {
                "event_type": "citation_validation_complete",
                "valid_count": len(valid_found),
                "invalid_count": len(invalid_found),
                "all_valid": all_valid,
            }}
        )
        return result

    def _extract_citations(self, text: str) -> List[int]:
        """Extract all [N] citation indices from text."""
        matches = self.CITATION_PATTERN.findall(text)
        return [int(m) for m in matches]

    def build_structured_citations(
        self,
        valid_indices: List[int],
        registry: CitationRegistry,
    ) -> List[Dict]:
        """
        Build structured citation objects for the API response.
        Only includes citations that were actually used and validated.
        """
        citations = []
        for idx in sorted(set(valid_indices)):
            block = registry.get_by_index(idx)
            if block is None:
                continue
            citations.append({
                "index": block.citation_index,
                "document_id": block.document_id,
                "chunk_id": block.chunk_id,
                "title": block.title,
                "source_authority": block.source_authority,
                "location": block.heading_path,
                "version_tag": block.document_version,
                "snippet": block.evidence_text[:300] if block.evidence_text else "",
            })
        return citations
