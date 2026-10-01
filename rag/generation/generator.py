# =============================================================================
# ELITEBUILD RAG — Grounded Answer Generator
# =============================================================================
# Orchestrates the complete answer generation pipeline:
# Evidence → Context Packaging → LLM Generation → Citation Validation → Response
#
# The generator may explain verified evidence but NEVER manufactures facts.
# =============================================================================

import re
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from rag.config.settings import settings
from rag.generation.citations import CitationValidator, CitationValidationResult
from rag.generation.grounding import (
    ContextBuilder,
    ContextConfig,
    CitationRegistry,
    EvidenceBlock,
    PackagedContext,
)
from rag.generation.llm_provider import LLMProvider, LLMResponse, get_llm_provider
from rag.generation.prompts import GROUNDED_SYSTEM_PROMPT
from rag.observability.logger import get_rag_logger, log_rag_query_telemetry
from rag.retrieval.engine import RetrievalResult

logger = get_rag_logger("elitebuild.rag.generation")


# ---------------------------------------------------------------------------
# Evidence Status Enum (deterministic, rules-based)
# ---------------------------------------------------------------------------

SUPPORTED = "SUPPORTED"
PARTIALLY_SUPPORTED = "PARTIALLY_SUPPORTED"
CONFLICTING_EVIDENCE = "CONFLICTING_EVIDENCE"
INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"


# ---------------------------------------------------------------------------
# Generation Result
# ---------------------------------------------------------------------------

@dataclass
class GenerationResult:
    """Complete result of the grounded answer generation pipeline."""
    request_id: str
    status: str                          # One of the 4 typed statuses
    answer: str
    citations: List[Dict[str, Any]]      # Structured citation objects
    evidence_count: int
    model: str
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    estimated_cost_usd: float = 0.0
    generation_latency_ms: float = 0.0
    citation_validation: Optional[CitationValidationResult] = None
    llm_error: Optional[str] = None      # Non-None if LLM failed


# ---------------------------------------------------------------------------
# Evidence Assessor (Deterministic + LLM-Assisted)
# ---------------------------------------------------------------------------

class EvidenceAssessor:
    """
    Determines the evidence status using deterministic rules.
    Authorization is NEVER delegated to the LLM.
    """

    def __init__(self, min_evidence_count: int = 1, min_score_threshold: float = 0.1):
        self.min_evidence_count = min_evidence_count
        self.min_score_threshold = min_score_threshold

    def assess(
        self,
        query: str,
        evidence_blocks: List[EvidenceBlock],
    ) -> str:
        """
        Determine evidence status based on deterministic rules.

        Decision logic:
        1. No evidence → INSUFFICIENT_EVIDENCE
        2. Evidence from conflicting versions → CONFLICTING_EVIDENCE
        3. Sufficient high-quality evidence → SUPPORTED
        4. Some but limited evidence → PARTIALLY_SUPPORTED
        """
        if not evidence_blocks:
            return INSUFFICIENT_EVIDENCE

        # Check for conflicting evidence (same document_id, different versions)
        doc_versions: Dict[str, set] = {}
        for block in evidence_blocks:
            doc_id = block.document_id
            if doc_id not in doc_versions:
                doc_versions[doc_id] = set()
            doc_versions[doc_id].add(block.document_version)

        has_conflicts = any(len(versions) > 1 for versions in doc_versions.values())
        if has_conflicts:
            return CONFLICTING_EVIDENCE

        # Check evidence quality
        high_quality_count = sum(
            1 for b in evidence_blocks
            if b.score >= self.min_score_threshold
        )

        if high_quality_count == 0:
            return INSUFFICIENT_EVIDENCE

        # If we have enough meaningful evidence, mark as supported
        if high_quality_count >= self.min_evidence_count:
            return SUPPORTED

        return PARTIALLY_SUPPORTED


# ---------------------------------------------------------------------------
# Grounded Answer Generator
# ---------------------------------------------------------------------------

class GroundedAnswerGenerator:
    """
    The central answer generation engine.

    Pipeline:
    1. Package evidence into bounded context with citation IDs
    2. Assess evidence status (deterministic rules)
    3. Generate grounded answer via LLM (if evidence exists)
    4. Validate citations in the generated answer
    5. Build structured response with traceable citations

    Critical invariant:
    The LLM is a CONTROLLED ANSWER FORMATTER using only retrieved evidence.
    It is NOT an independent source of company facts.
    """

    def __init__(
        self,
        llm_provider: Optional[LLMProvider] = None,
        context_config: Optional[ContextConfig] = None,
    ):
        self.llm = llm_provider or get_llm_provider()
        self.context_builder = ContextBuilder(config=context_config)
        self.citation_validator = CitationValidator()
        self.evidence_assessor = EvidenceAssessor()

    def generate(
        self,
        query: str,
        retrieval_results: List[RetrievalResult],
        request_id: Optional[str] = None,
        tenant_id: str = "elitebuild-core",
        user_role: str = "PUBLIC",
        user_id: Optional[str] = None,
    ) -> GenerationResult:
        """
        Execute the complete grounded answer generation pipeline.

        Args:
            query: The user's natural language question
            retrieval_results: Pre-authorized evidence from Step 11 retrieval
            request_id: Unique request identifier
            tenant_id: Tenant for telemetry
            user_role: User role for telemetry
            user_id: User ID for telemetry (masked in logs)

        Returns:
            GenerationResult with answer, citations, status, and telemetry
        """
        request_id = request_id or f"rag-gen-{uuid.uuid4().hex[:12]}"
        gen_start = time.time()

        # -----------------------------------------------------------------
        # 1. Package evidence into bounded context
        # -----------------------------------------------------------------
        packaged, registry = self.context_builder.build_context(retrieval_results)

        # -----------------------------------------------------------------
        # 2. Assess evidence status (deterministic, NOT LLM-decided)
        # -----------------------------------------------------------------
        status = self.evidence_assessor.assess(query, packaged.evidence_blocks)

        # -----------------------------------------------------------------
        # 3. Generate answer (or return early for INSUFFICIENT_EVIDENCE)
        # -----------------------------------------------------------------
        if status == INSUFFICIENT_EVIDENCE:
            elapsed = (time.time() - gen_start) * 1000
            return GenerationResult(
                request_id=request_id,
                status=INSUFFICIENT_EVIDENCE,
                answer=(
                    "The available ELITEBUILD knowledge base does not contain "
                    "sufficient verified information to answer this question."
                ),
                citations=[],
                evidence_count=0,
                model=self.llm.get_model_name(),
                generation_latency_ms=elapsed,
            )

        # Build the user prompt with evidence context
        user_prompt = self._build_user_prompt(query, packaged.formatted_context, status)

        # Call LLM
        llm_response = self.llm.generate(
            system_prompt=GROUNDED_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            temperature=settings.llm_temperature,
            max_tokens=2000,
            timeout_seconds=30,
        )

        # -----------------------------------------------------------------
        # 4. Handle LLM failure gracefully
        # -----------------------------------------------------------------
        if llm_response.error:
            elapsed = (time.time() - gen_start) * 1000
            logger.error(
                f"LLM generation failed for {request_id}: {llm_response.error}"
            )
            # Fallback: evidence was found but generation failed
            fallback_answer = self._build_fallback_response(
                packaged.evidence_blocks, llm_response.error
            )
            return GenerationResult(
                request_id=request_id,
                status=status,
                answer=fallback_answer,
                citations=self.citation_validator.build_structured_citations(
                    [b.citation_index for b in packaged.evidence_blocks],
                    registry,
                ),
                evidence_count=packaged.evidence_count,
                model=self.llm.get_model_name(),
                generation_latency_ms=elapsed,
                llm_error=llm_response.error,
            )

        # -----------------------------------------------------------------
        # 5. Validate citations in the generated answer
        # -----------------------------------------------------------------
        validation = self.citation_validator.validate(llm_response.text, registry)

        # Build structured citation objects (only for valid citations)
        structured_citations = self.citation_validator.build_structured_citations(
            validation.valid_citations,
            registry,
        )

        elapsed = (time.time() - gen_start) * 1000

        # -----------------------------------------------------------------
        # 6. Log telemetry
        # -----------------------------------------------------------------
        log_rag_query_telemetry(
            logger=logger,
            request_id=request_id,
            tenant_id=tenant_id,
            user_id=user_id,
            user_role=user_role,
            query_text=query,
            status=status,
            total_latency_ms=elapsed,
            retrieval_latency_ms=0.0,       # Tracked separately in the API layer
            rerank_latency_ms=0.0,          # Tracked separately
            generation_latency_ms=llm_response.latency_ms,
            prompt_tokens=llm_response.input_tokens,
            completion_tokens=llm_response.output_tokens,
            cost_usd=llm_response.estimated_cost_usd,
            retrieved_count=packaged.evidence_count,
            reranked_count=packaged.evidence_count,
            citation_count=len(structured_citations),
        )

        return GenerationResult(
            request_id=request_id,
            status=status,
            answer=validation.validated_answer,
            citations=structured_citations,
            evidence_count=packaged.evidence_count,
            model=llm_response.model,
            input_tokens=llm_response.input_tokens,
            output_tokens=llm_response.output_tokens,
            total_tokens=llm_response.total_tokens,
            estimated_cost_usd=llm_response.estimated_cost_usd,
            generation_latency_ms=llm_response.latency_ms,
            citation_validation=validation,
        )

    def _build_user_prompt(
        self, query: str, formatted_context: str, status: str
    ) -> str:
        """Build the complete user prompt with query and evidence."""
        parts = [
            f"## USER QUESTION\n{query}\n",
            f"## RETRIEVED EVIDENCE\n{formatted_context}\n",
        ]

        if status == CONFLICTING_EVIDENCE:
            parts.append(
                "## NOTICE\n"
                "The retrieved evidence contains conflicting information from "
                "different versions or sources. Present both sides with their "
                "citations. Do NOT silently choose one over the other.\n"
            )
        elif status == PARTIALLY_SUPPORTED:
            parts.append(
                "## NOTICE\n"
                "Only partial evidence is available. Answer what is supported "
                "and clearly identify what information is missing or unavailable.\n"
            )

        parts.append(
            "## INSTRUCTIONS\n"
            "Answer the question using ONLY the evidence provided above. "
            "Cite every factual claim using [N] notation. "
            "If information is missing, say so explicitly."
        )

        return "\n".join(parts)

    @staticmethod
    def _build_fallback_response(
        evidence_blocks: List[EvidenceBlock],
        error: str,
    ) -> str:
        """
        Build a controlled fallback when LLM generation fails.
        Does NOT fabricate an answer — exposes evidence references only.
        """
        parts = [
            "Answer generation is currently unavailable. "
            "However, relevant evidence was found in the ELITEBUILD knowledge base."
        ]

        if evidence_blocks:
            parts.append("\nRelevant evidence sources:")
            for block in evidence_blocks[:3]:
                parts.append(
                    f"  - [{block.citation_index}] {block.document_id} "
                    f"(Section: {block.heading_path or 'N/A'}, "
                    f"Version: {block.document_version})"
                )

        parts.append(
            "\nPlease retry your query shortly. If the issue persists, "
            "contact the system administrator."
        )
        return "\n".join(parts)
