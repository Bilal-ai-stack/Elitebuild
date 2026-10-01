# ELITEBUILD RAG Evaluation Package
from rag.evaluation.metrics import (
    recall_at_k,
    precision_at_k,
    reciprocal_rank,
    ndcg_at_k,
    calculate_faithfulness,
    calculate_token_f1,
    detect_hallucination,
    evaluate_citations,
    calculate_percentile,
    build_status_confusion_matrix,
)
from rag.evaluation.runner import BenchmarkRunner
from rag.evaluation.security_eval import SecurityEvaluationSuite
from rag.evaluation.reporter import EvaluationReporter

__all__ = [
    "recall_at_k",
    "precision_at_k",
    "reciprocal_rank",
    "ndcg_at_k",
    "calculate_faithfulness",
    "calculate_token_f1",
    "detect_hallucination",
    "evaluate_citations",
    "calculate_percentile",
    "build_status_confusion_matrix",
    "BenchmarkRunner",
    "SecurityEvaluationSuite",
    "EvaluationReporter",
]
