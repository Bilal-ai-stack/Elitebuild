# =============================================================================
# ELITEBUILD RAG — Step 13 Evaluation Framework Tests
# =============================================================================
# Tests the deterministic mathematical correctness of:
# 1. Recall@K and Precision@K
# 2. Mean Reciprocal Rank (MRR)
# 3. Normalized Discounted Cumulative Gain (NDCG@K)
# 4. Percentile Calculations (p50, p95)
# 5. Token F1 and Faithfulness scoring
# 6. Hallucination detection
# 7. Status confusion matrix
# 8. Citation validation and traceability
# 9. Gold benchmark JSON schema compliance
# =============================================================================

import json
import math
import os
import jsonschema
import pytest

from rag.evaluation.metrics import (
    recall_at_k,
    precision_at_k,
    reciprocal_rank,
    ndcg_at_k,
    calculate_percentile,
    calculate_token_f1,
    calculate_faithfulness,
    detect_hallucination,
    build_status_confusion_matrix,
    evaluate_citations,
)
from rag.retrieval.engine import RetrievalResult


class TestStep13EvaluationMetrics:
    """Deterministic validation of RAG evaluation metrics."""

    def test_recall_at_k(self):
        ground_truth = ["doc-1", "doc-2"]

        # Top 1 has 1 of 2
        assert recall_at_k(["doc-1", "doc-3", "doc-4"], ground_truth, k=1) == 0.5
        # Top 2 has 1 of 2
        assert recall_at_k(["doc-1", "doc-3", "doc-4"], ground_truth, k=2) == 0.5
        # Top 3 has 1 of 2
        assert recall_at_k(["doc-1", "doc-3", "doc-4"], ground_truth, k=3) == 0.5
        # Perfect recall at k=2
        assert recall_at_k(["doc-1", "doc-2", "doc-3"], ground_truth, k=2) == 1.0
        # Zero recall
        assert recall_at_k(["doc-5", "doc-6"], ground_truth, k=2) == 0.0
        # Empty ground truth
        assert recall_at_k(["doc-1"], [], k=1) == 0.0

    def test_precision_at_k(self):
        ground_truth = ["doc-1", "doc-2"]

        # 1 hit out of 1
        assert precision_at_k(["doc-1", "doc-3", "doc-4"], ground_truth, k=1) == 1.0
        # 1 hit out of 2
        assert precision_at_k(["doc-1", "doc-3", "doc-4"], ground_truth, k=2) == 0.5
        # 1 hit out of 3
        assert precision_at_k(["doc-1", "doc-3", "doc-4"], ground_truth, k=3) == pytest.approx(1 / 3)
        # 2 hits out of 2
        assert precision_at_k(["doc-1", "doc-2", "doc-3"], ground_truth, k=2) == 1.0
        # 0 hits out of 2
        assert precision_at_k(["doc-5", "doc-6"], ground_truth, k=2) == 0.0

    def test_reciprocal_rank(self):
        ground_truth = ["doc-target"]

        # First place -> 1.0
        assert reciprocal_rank(["doc-target", "doc-other"], ground_truth) == 1.0
        # Second place -> 0.5
        assert reciprocal_rank(["doc-other", "doc-target"], ground_truth) == 0.5
        # Third place -> 1/3
        assert reciprocal_rank(["doc-a", "doc-b", "doc-target"], ground_truth) == pytest.approx(1 / 3)
        # Not found -> 0.0
        assert reciprocal_rank(["doc-a", "doc-b"], ground_truth) == 0.0

    def test_ndcg_at_k(self):
        ground_truth = ["doc-1", "doc-2"]

        # Ideal ranking: both in top 2
        perfect_ndcg = ndcg_at_k(["doc-1", "doc-2", "doc-3"], ground_truth, k=2)
        assert perfect_ndcg == pytest.approx(1.0)

        # Sub-optimal: doc-1 at rank 1, doc-2 missing
        partial_ndcg = ndcg_at_k(["doc-1", "doc-3", "doc-4"], ground_truth, k=2)
        assert 0.0 < partial_ndcg < 1.0

        # Zero relevance
        zero_ndcg = ndcg_at_k(["doc-x", "doc-y"], ground_truth, k=2)
        assert zero_ndcg == 0.0

    def test_calculate_percentile(self):
        values = [10.0, 20.0, 30.0, 40.0, 50.0, 60.0, 70.0, 80.0, 90.0, 100.0]

        p50 = calculate_percentile(values, 50.0)
        p95 = calculate_percentile(values, 95.0)

        assert 50.0 <= p50 <= 60.0
        assert 90.0 <= p95 <= 100.0
        assert calculate_percentile([], 50.0) == 0.0

    def test_token_f1_correctness(self):
        gold = "Reinforced cement concrete bridge structures"
        pred_exact = "Reinforced cement concrete bridge structures"
        pred_partial = "Reinforced concrete bridge works"
        pred_none = "Completely unrelated words here"

        assert calculate_token_f1(pred_exact, gold) == pytest.approx(1.0)
        assert 0.0 < calculate_token_f1(pred_partial, gold) < 1.0
        assert calculate_token_f1(pred_none, gold) == 0.0
        assert calculate_token_f1("", "") == 1.0

    def test_faithfulness_and_hallucination(self):
        context = "Elite Construction Company was established in 2006 in Peshawar."
        grounded_answer = "Elite was established in 2006 in Peshawar."
        hallucinated_answer = "Elite constructed secret nuclear submarines in the Arctic Ocean."

        # Grounded answer: high faithfulness, no hallucination
        faith_grounded = calculate_faithfulness(grounded_answer, context, "SUPPORTED")
        assert faith_grounded > 0.5
        assert not detect_hallucination(grounded_answer, context, "SUPPORTED")

        # Unsupported answer with claimed status: low faithfulness, hallucination flagged
        faith_unsupported = calculate_faithfulness(hallucinated_answer, context, "SUPPORTED")
        assert faith_unsupported < 0.3
        assert detect_hallucination(hallucinated_answer, context, "SUPPORTED")

        # Insufficient evidence status: properly handles absence of hallucination
        insufficient_resp = "I cannot find sufficient evidence in the verified records."
        assert not detect_hallucination(insufficient_resp, "", "INSUFFICIENT_EVIDENCE")

    def test_status_confusion_matrix(self):
        expected = ["SUPPORTED", "SUPPORTED", "PARTIALLY_SUPPORTED", "INSUFFICIENT_EVIDENCE"]
        predicted = ["SUPPORTED", "PARTIALLY_SUPPORTED", "PARTIALLY_SUPPORTED", "INSUFFICIENT_EVIDENCE"]

        matrix = build_status_confusion_matrix(expected, predicted)

        assert matrix["SUPPORTED"]["SUPPORTED"] == 1
        assert matrix["SUPPORTED"]["PARTIALLY_SUPPORTED"] == 1
        assert matrix["PARTIALLY_SUPPORTED"]["PARTIALLY_SUPPORTED"] == 1
        assert matrix["INSUFFICIENT_EVIDENCE"]["INSUFFICIENT_EVIDENCE"] == 1

    def test_citation_evaluation(self):
        evidence = [
            RetrievalResult(
                chunk_id="chk-1",
                document_id="doc-1",
                document_version="1.0",
                score=0.9,
                source_authority="VERIFIED_DOCUMENT",
                security_access_level="PUBLIC",
                chunk_text="Civil construction services [1].",
            )
        ]

        # Valid citation [1]
        valid_res = evaluate_citations("Documented work [1].", [{"index": 1, "document_id": "doc-1"}], evidence)
        assert valid_res["cited_indices_count"] == 1
        assert valid_res["fabricated_citations_count"] == 0
        assert valid_res["traceability_rate"] == 1.0

        # Fabricated citation [99]
        fab_res = evaluate_citations("Documented work [99].", [{"index": 99, "document_id": "unknown"}], evidence)
        assert fab_res["fabricated_citations_count"] == 1
        assert fab_res["traceability_rate"] == 0.0


class TestGoldBenchmarkDataset:
    """Verifies integrity, schema adherence, and verified origin of gold benchmark."""

    def test_gold_dataset_schema_validation(self):
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        dataset_path = os.path.join(base_dir, "evaluation", "gold_benchmark_v1.json")
        schema_path = os.path.join(base_dir, "evaluation", "dataset_schema.json")

        assert os.path.exists(dataset_path), "gold_benchmark_v1.json must exist"
        assert os.path.exists(schema_path), "dataset_schema.json must exist"

        with open(dataset_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        with open(schema_path, "r", encoding="utf-8") as f:
            schema = json.load(f)

        # Strict JSON schema validation
        jsonschema.validate(instance=data, schema=schema)

        test_cases = data["test_cases"]
        assert 25 <= len(test_cases) <= 50, f"Expected 25-50 test cases, found {len(test_cases)}"

        # Check unique test case IDs
        ids = [tc["test_case_id"] for tc in test_cases]
        assert len(ids) == len(set(ids)), "Test case IDs must be strictly unique"

        # Check all required fields present
        for tc in test_cases:
            assert tc["query"], "Query must not be empty"
            assert tc["ground_truth_answer"], "Ground truth answer must not be empty"
            assert tc["expected_status"] in (
                "SUPPORTED",
                "PARTIALLY_SUPPORTED",
                "CONFLICTING_EVIDENCE",
                "INSUFFICIENT_EVIDENCE",
            )
