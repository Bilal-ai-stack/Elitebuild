# =============================================================================
# ELITEBUILD RAG — Evaluation Metrics
# =============================================================================
# Mathematically sound, deterministic implementations of RAG evaluation metrics:
# - Retrieval: Recall@K, Precision@K, MRR, NDCG@K
# - Generation: Faithfulness, Correctness, Hallucination Rate
# - Evidence Status: Accuracy, Confusion Matrix
# - Citations: Traceability, Completeness, Fabrication Rate
# - System: Latency (p50, p95), Token Usage, Estimated Cost
# =============================================================================

import math
import re
from typing import Any, Dict, List, Optional, Set, Tuple


# ---------------------------------------------------------------------------
# Retrieval Metrics
# ---------------------------------------------------------------------------

def recall_at_k(
    retrieved_doc_ids: List[str],
    ground_truth_doc_ids: List[str],
    k: int,
) -> float:
    """
    Calculate Recall@K: proportion of relevant ground-truth documents
    found within the top K retrieved documents.

    Recall@K = |Relevant ∩ Retrieved@K| / |Relevant|
    """
    if not ground_truth_doc_ids:
        # Negative control / out-of-domain: if no relevant docs exist,
        # retrieval of nothing is optimal (1.0), retrieval of docs is false positive (0.0).
        return 1.0 if not retrieved_doc_ids[:k] else 0.0

    if k <= 0:
        return 0.0

    retrieved_top_k = set(retrieved_doc_ids[:k])
    ground_truth_set = set(ground_truth_doc_ids)
    hits = retrieved_top_k.intersection(ground_truth_set)

    return len(hits) / len(ground_truth_set)


def precision_at_k(
    retrieved_doc_ids: List[str],
    ground_truth_doc_ids: List[str],
    k: int,
) -> float:
    """
    Calculate Precision@K: proportion of top K retrieved documents
    that are relevant according to ground truth.

    Precision@K = |Relevant ∩ Retrieved@K| / K
    """
    if k <= 0:
        return 0.0

    if not ground_truth_doc_ids:
        # For negative controls: 0 relevant docs in top K means 0 precision
        return 0.0

    retrieved_top_k = set(retrieved_doc_ids[:k])
    ground_truth_set = set(ground_truth_doc_ids)
    hits = retrieved_top_k.intersection(ground_truth_set)

    return len(hits) / k


def reciprocal_rank(
    retrieved_doc_ids: List[str],
    ground_truth_doc_ids: List[str],
) -> float:
    """
    Calculate Reciprocal Rank (RR): reciprocal of the 1-based rank position
    of the first relevant document. Returns 0.0 if no relevant document found.

    RR = 1 / rank_first
    """
    if not ground_truth_doc_ids:
        return 1.0 if not retrieved_doc_ids else 0.0

    ground_truth_set = set(ground_truth_doc_ids)
    for rank, doc_id in enumerate(retrieved_doc_ids, start=1):
        if doc_id in ground_truth_set:
            return 1.0 / rank

    return 0.0


def ndcg_at_k(
    retrieved_doc_ids: List[str],
    ground_truth_doc_ids: List[str],
    k: int,
) -> float:
    """
    Calculate Normalized Discounted Cumulative Gain at rank K (NDCG@K).
    Uses binary relevance (1 for ground-truth match, 0 otherwise).

    DCG@K = sum_{i=1}^K (2^{rel_i} - 1) / log2(i + 1)
    IDCG@K = Ideal DCG with all relevant documents at top ranks.
    """
    if k <= 0:
        return 0.0

    if not ground_truth_doc_ids:
        return 1.0 if not retrieved_doc_ids[:k] else 0.0

    ground_truth_set = set(ground_truth_doc_ids)

    # Calculate DCG@K
    dcg = 0.0
    for i, doc_id in enumerate(retrieved_doc_ids[:k], start=1):
        rel = 1.0 if doc_id in ground_truth_set else 0.0
        if rel > 0:
            dcg += (2.0 ** rel - 1.0) / math.log2(i + 1)

    # Calculate IDCG@K (all relevant items at top ranks, up to min(k, len(ground_truth)))
    ideal_hits = min(k, len(ground_truth_set))
    idcg = 0.0
    for i in range(1, ideal_hits + 1):
        idcg += (2.0 ** 1.0 - 1.0) / math.log2(i + 1)

    if idcg == 0.0:
        return 0.0

    return dcg / idcg


# ---------------------------------------------------------------------------
# Generation & Groundedness Metrics
# ---------------------------------------------------------------------------

def calculate_token_f1(prediction: str, ground_truth: str) -> float:
    """Compute token-level F1 score between prediction and ground truth text."""
    pred_tokens = re.findall(r'\w+', prediction.lower())
    gt_tokens = re.findall(r'\w+', ground_truth.lower())

    if not pred_tokens or not gt_tokens:
        return 1.0 if pred_tokens == gt_tokens else 0.0

    common = set(pred_tokens) & set(gt_tokens)
    if not common:
        return 0.0

    precision = sum(min(pred_tokens.count(t), gt_tokens.count(t)) for t in common) / len(pred_tokens)
    recall = sum(min(pred_tokens.count(t), gt_tokens.count(t)) for t in common) / len(gt_tokens)

    if precision + recall == 0:
        return 0.0

    return 2.0 * (precision * recall) / (precision + recall)


def calculate_faithfulness(
    answer: str,
    context: str,
    status: str,
) -> float:
    """
    Evaluate faithfulness: are statements in the answer grounded in the evidence context?
    If status is INSUFFICIENT_EVIDENCE and answer declines gracefully, faithfulness is 1.0.
    """
    if not answer.strip():
        return 0.0

    # If the system correctly identified insufficient evidence
    if status == "INSUFFICIENT_EVIDENCE":
        lower = answer.lower()
        if "not contain" in lower or "no evidence" in lower or "insufficient" in lower or "cannot find" in lower or "not found" in lower:
            return 1.0
        # If it generated claims without evidence, faithfulness is 0.0
        return 0.0

    # Split answer into statements / sentences
    sentences = [s.strip() for s in re.split(r'[.!?]\s+', answer) if len(s.strip()) > 10]
    if not sentences:
        return 1.0

    context_words = set(re.findall(r'\w+', context.lower()))
    supported_sentences = 0

    for sent in sentences:
        # Strip citation markers like [1], [2]
        clean_sent = re.sub(r'\[\d+\]', '', sent)
        sent_words = [w for w in re.findall(r'\w+', clean_sent.lower()) if len(w) > 3]

        if not sent_words:
            supported_sentences += 1
            continue

        # Check word overlap with context
        overlap = sum(1 for w in sent_words if w in context_words)
        overlap_ratio = overlap / len(sent_words)

        if overlap_ratio >= 0.60:
            supported_sentences += 1

    return supported_sentences / len(sentences)


def detect_hallucination(
    answer: str,
    context: str,
    status: str,
) -> bool:
    """
    Returns True if the response exhibits hallucination:
    - Fabricated statements not supported by context
    - Making affirmative claims when status is INSUFFICIENT_EVIDENCE
    """
    if status == "INSUFFICIENT_EVIDENCE":
        # Any affirmative claim of projects/dates/figures when no evidence exists is a hallucination
        lower = answer.lower()
        if "not contain" in lower or "no evidence" in lower or "insufficient" in lower or "cannot find" in lower or "not found" in lower:
            return False
        return True

    faithfulness = calculate_faithfulness(answer, context, status)
    return faithfulness < 0.50


# ---------------------------------------------------------------------------
# Citation Quality Metrics
# ---------------------------------------------------------------------------

def evaluate_citations(
    answer: str,
    citations: List[Dict[str, Any]],
    retrieved_chunks: List[Any],
) -> Dict[str, Any]:
    """
    Evaluate citation correctness, completeness, traceability, and fabrication.
    """
    cited_indices = [int(m) for m in re.findall(r'\[(\d+)\]', answer)]
    valid_retrieved_indices = {i + 1 for i in range(len(retrieved_chunks))}

    # Fabrication: citations that do not map to any retrieved evidence index
    fabricated = [c for c in cited_indices if c not in valid_retrieved_indices]
    fabrication_rate = len(fabricated) / len(cited_indices) if cited_indices else 0.0

    # Traceability: citations with document_id or chunk_id present in retrieved set
    traceable_count = 0
    retrieved_chunk_ids = {getattr(c, "chunk_id", None) or (c.get("chunk_id") if isinstance(c, dict) else None) for c in retrieved_chunks}
    retrieved_doc_ids = {getattr(c, "document_id", None) or (c.get("document_id") if isinstance(c, dict) else None) for c in retrieved_chunks}

    for cit in citations:
        c_id = cit.get("chunk_id") or cit.get("chunkId")
        d_id = cit.get("document_id") or cit.get("documentId")
        if (c_id and c_id in retrieved_chunk_ids) or (d_id and d_id in retrieved_doc_ids):
            traceable_count += 1

    traceability_rate = traceable_count / len(citations) if citations else (1.0 if not cited_indices else 0.0)

    # Completeness: if answer is substantial (>20 words) and supported, does it have at least 1 citation?
    is_complete = True
    if len(answer.split()) > 20 and "does not contain" not in answer.lower():
        is_complete = len(cited_indices) > 0

    return {
        "cited_indices_count": len(cited_indices),
        "unique_citations_count": len(set(cited_indices)),
        "fabricated_citations_count": len(fabricated),
        "fabrication_rate": round(fabrication_rate, 4),
        "traceability_rate": round(traceability_rate, 4),
        "completeness": is_complete,
    }


# ---------------------------------------------------------------------------
# System Performance & Statistics
# ---------------------------------------------------------------------------

def calculate_percentile(values: List[float], p: float) -> float:
    """
    Calculate p-th percentile (0 <= p <= 100) using nearest-rank / linear interpolation.
    """
    if not values:
        return 0.0

    sorted_vals = sorted(values)
    n = len(sorted_vals)

    if n == 1:
        return sorted_vals[0]

    k = (n - 1) * (p / 100.0)
    f = math.floor(k)
    c = math.ceil(k)

    if f == c:
        return sorted_vals[int(k)]

    d0 = sorted_vals[int(f)] * (c - k)
    d1 = sorted_vals[int(c)] * (k - f)
    return d0 + d1


# ---------------------------------------------------------------------------
# Confusion Matrix
# ---------------------------------------------------------------------------

VALID_STATUSES = ["SUPPORTED", "PARTIALLY_SUPPORTED", "CONFLICTING_EVIDENCE", "INSUFFICIENT_EVIDENCE"]

def build_status_confusion_matrix(
    expected_list: List[str],
    predicted_list: List[str],
) -> Dict[str, Dict[str, int]]:
    """
    Build a 4x4 confusion matrix for evidence status classifications.
    matrix[expected][predicted] = count
    """
    matrix: Dict[str, Dict[str, int]] = {
        exp: {pred: 0 for pred in VALID_STATUSES} for exp in VALID_STATUSES
    }

    for exp, pred in zip(expected_list, predicted_list):
        exp_clean = exp if exp in VALID_STATUSES else "INSUFFICIENT_EVIDENCE"
        pred_clean = pred if pred in VALID_STATUSES else "INSUFFICIENT_EVIDENCE"
        matrix[exp_clean][pred_clean] += 1

    return matrix
