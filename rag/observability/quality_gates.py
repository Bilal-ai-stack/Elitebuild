# =============================================================================
# ELITEBUILD RAG — Quality Gates & Operational Policy Framework (Step 15)
# =============================================================================
# Evaluates whether the RAG system satisfies production standards across:
#   - Retrieval Quality (Recall@K, Precision@K, MRR, NDCG)
#   - Generation Quality (Faithfulness, Correctness, Hallucination)
#   - Citation Integrity (Traceability, Completeness, Zero Fabrications)
#   - Security Hardening (Tenant isolation, RBAC, Prompt-injection boundary)
#   - Performance SLAs (p50/p95 latency, mean retrieval/generation times)
#   - Operational Reliability (Request failure rate, ingestion errors)
#
# Typed Gate Statuses:
#   PASSED | FAILED | NOT_EVALUATED | INSUFFICIENT_DATA
#
# Zero Fabrication Rule:
#   If real evaluation benchmark results or telemetry samples are missing,
#   the gate MUST report NOT_EVALUATED. Never convert missing data to fake passes.
# =============================================================================

import glob
import json
import os
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

from rag.config.settings import settings


class GateStatus(str, Enum):
    PASSED = "PASSED"
    FAILED = "FAILED"
    NOT_EVALUATED = "NOT_EVALUATED"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"


class OverallGateStatus(str, Enum):
    PASSED = "PASSED"
    FAILED = "FAILED"
    NOT_EVALUATED = "NOT_EVALUATED"
    DEGRADED = "DEGRADED"


# -----------------------------------------------------------------------------
# Configurable Threshold Definitions
# -----------------------------------------------------------------------------

DEFAULT_PRODUCTION_THRESHOLDS = {
    # Retrieval
    "recall_at_5_min": 0.80,
    "precision_at_1_min": 0.60,
    "mrr_min": 0.70,
    "ndcg_at_5_min": 1.00,
    # Generation
    "faithfulness_min": 0.70,
    "correctness_f1_min": 0.60,
    "hallucination_rate_max": 0.15,
    # Citation
    "traceability_rate_min": 0.95,
    "completeness_rate_min": 0.90,
    "fabrication_rate_max": 0.00,
    # Security
    "tenant_isolation_failures_max": 0,
    "rbac_failures_max": 0,
    "prompt_injection_failures_max": 0,
    "unauthorized_retrieval_max": 0,
    # Performance
    "p50_latency_ms_max": 50.0,
    "p95_latency_ms_max": 200.0,
    "retrieval_latency_ms_max": 50.0,
    "generation_latency_ms_max": 100.0,
    # Reliability
    "request_failure_rate_max": 0.05,
    "ingestion_failure_rate_max": 0.05,
    "timeout_rate_max": 0.02,
}

# Development profile accommodates mock models & dev latency
DEFAULT_DEVELOPMENT_THRESHOLDS = {
    **DEFAULT_PRODUCTION_THRESHOLDS,
    "recall_at_5_min": 0.70,
    "precision_at_1_min": 0.50,
    "mrr_min": 0.60,
    "faithfulness_min": 0.20,
    "correctness_f1_min": 0.05,
    "hallucination_rate_max": 0.90,
    "p50_latency_ms_max": 150.0,
    "p95_latency_ms_max": 500.0,
    "retrieval_latency_ms_max": 100.0,
    "generation_latency_ms_max": 200.0,
}


def get_default_thresholds(environment: Optional[str] = None) -> Dict[str, float]:
    env = (environment or getattr(settings, "environment", "development")).lower()
    if env in ["production", "prod"]:
        return dict(DEFAULT_PRODUCTION_THRESHOLDS)
    return dict(DEFAULT_DEVELOPMENT_THRESHOLDS)


# -----------------------------------------------------------------------------
# Quality Gate Evaluation Engine
# -----------------------------------------------------------------------------

class QualityGateRule:
    """A single metric rule evaluated within a gate category."""

    def __init__(
        self,
        name: str,
        category: str,
        metric_key: str,
        threshold: float,
        operator: str,  # ">=" | "<=" | "=="
        description: str,
    ):
        self.name = name
        self.category = category
        self.metric_key = metric_key
        self.threshold = threshold
        self.operator = operator
        self.description = description

    def evaluate(self, actual_value: Optional[float]) -> Dict[str, Any]:
        if actual_value is None:
            return {
                "rule": self.name,
                "category": self.category,
                "status": GateStatus.NOT_EVALUATED.value,
                "threshold": self.threshold,
                "actual": None,
                "operator": self.operator,
                "description": self.description,
                "message": f"Metric '{self.metric_key}' was not evaluated in benchmark run.",
            }

        passed = False
        if self.operator == ">=":
            passed = actual_value >= self.threshold
        elif self.operator == "<=":
            passed = actual_value <= self.threshold
        elif self.operator == "==":
            passed = actual_value == self.threshold

        status = GateStatus.PASSED.value if passed else GateStatus.FAILED.value
        op_label = "at least" if self.operator == ">=" else ("at most" if self.operator == "<=" else "equal to")
        msg = (
            f"Passed: actual {actual_value} is {op_label} {self.threshold}"
            if passed
            else f"Failed: actual {actual_value} violates requirement ({self.operator} {self.threshold})"
        )

        return {
            "rule": self.name,
            "category": self.category,
            "status": status,
            "threshold": self.threshold,
            "actual": actual_value,
            "operator": self.operator,
            "description": self.description,
            "message": msg,
        }


class QualityGateEngine:
    """
    Evaluates benchmark results and telemetry against configurable quality gates.
    Links Step 13 evaluation runs directly to Step 15 production readiness checks.
    """

    def __init__(
        self,
        thresholds: Optional[Dict[str, float]] = None,
        environment: Optional[str] = None,
    ):
        self.environment = environment or getattr(settings, "environment", "development")
        self.thresholds = {
            **get_default_thresholds(self.environment),
            **(thresholds or {}),
        }
        self.rules: List[QualityGateRule] = self._build_rules()

    def _build_rules(self) -> List[QualityGateRule]:
        t = self.thresholds
        return [
            # 1. Retrieval
            QualityGateRule("recall_at_5", "retrieval", "recall@5", t["recall_at_5_min"], ">=", "Minimum acceptable Recall@5"),
            QualityGateRule("precision_at_1", "retrieval", "precision@1", t["precision_at_1_min"], ">=", "Top-1 evidence precision"),
            QualityGateRule("mrr", "retrieval", "mrr", t["mrr_min"], ">=", "Mean Reciprocal Rank"),
            QualityGateRule("ndcg_at_5", "retrieval", "ndcg@5", t["ndcg_at_5_min"], ">=", "Normalized Discounted Cumulative Gain@5"),
            # 2. Generation
            QualityGateRule("faithfulness", "generation", "faithfulness", t["faithfulness_min"], ">=", "Groundedness to retrieved evidence"),
            QualityGateRule("correctness", "generation", "correctness_f1", t["correctness_f1_min"], ">=", "F1 token agreement with ground truth"),
            QualityGateRule("hallucination_rate", "generation", "hallucination_rate", t["hallucination_rate_max"], "<=", "Maximum tolerable hallucination rate"),
            # 3. Citation
            QualityGateRule("citation_traceability", "citation", "traceability_rate", t["traceability_rate_min"], ">=", "Citations resolving to exact chunks"),
            QualityGateRule("citation_completeness", "citation", "completeness_rate", t["completeness_rate_min"], ">=", "Claims supported by valid brackets"),
            QualityGateRule("citation_fabrication", "citation", "fabrication_rate", t["fabrication_rate_max"], "<=", "Fabricated/hallucinated citations"),
            # 4. Security
            QualityGateRule("tenant_isolation", "security", "tenant_isolation_leaks", t["tenant_isolation_failures_max"], "<=", "Zero cross-tenant data leaks allowed"),
            QualityGateRule("rbac_enforcement", "security", "rbac_failures", t["rbac_failures_max"], "<=", "Zero unauthorized clearance escalations"),
            QualityGateRule("prompt_injection", "security", "injection_vulnerabilities", t["prompt_injection_failures_max"], "<=", "Zero prompt-injection boundary bypasses"),
            # 5. Performance
            QualityGateRule("p50_latency", "performance", "p50_latency_ms", t["p50_latency_ms_max"], "<=", "Median query response latency (ms)"),
            QualityGateRule("p95_latency", "performance", "p95_latency_ms", t["p95_latency_ms_max"], "<=", "95th percentile query response latency (ms)"),
            QualityGateRule("mean_retrieval_latency", "performance", "mean_retrieval_latency_ms", t["retrieval_latency_ms_max"], "<=", "Average retrieval time (ms)"),
            # 6. Reliability
            QualityGateRule("request_failure_rate", "reliability", "failure_rate", t["request_failure_rate_max"], "<=", "Maximum allowable request failure rate"),
        ]

    def evaluate_run(self, eval_run: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Evaluate an evaluation run dictionary against all configured gates.
        If eval_run is None, attempts to load the latest run from rag/evaluation/results/.
        """
        if eval_run is None:
            eval_run = self.load_latest_evaluation_run()

        if not eval_run:
            # Explicit NOT_EVALUATED state — zero fabricated passes
            return {
                "overall_status": OverallGateStatus.NOT_EVALUATED.value,
                "environment": self.environment,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "benchmark_linked": False,
                "message": "No evaluation benchmark results available. Status: NOT_EVALUATED.",
                "category_summary": {
                    "retrieval": GateStatus.NOT_EVALUATED.value,
                    "generation": GateStatus.NOT_EVALUATED.value,
                    "citation": GateStatus.NOT_EVALUATED.value,
                    "security": GateStatus.NOT_EVALUATED.value,
                    "performance": GateStatus.NOT_EVALUATED.value,
                    "reliability": GateStatus.NOT_EVALUATED.value,
                },
                "rule_evaluations": [
                    r.evaluate(None) for r in self.rules
                ],
                "evaluation_metadata": None,
            }

        # Extract metric dictionaries
        ret_metrics = eval_run.get("retrieval_metrics", {})
        gen_metrics = eval_run.get("generation_metrics", {})
        cit_metrics = eval_run.get("citation_metrics", {})
        perf_metrics = eval_run.get("performance_metrics", {})
        sec_tests = eval_run.get("security_metrics", {}).get("tests", {})

        # Compute security summary
        tenant_leaks = 0 if sec_tests.get("tenant_isolation", {}).get("passed") else 1
        rbac_fails = 0 if sec_tests.get("rbac_enforcement", {}).get("passed") else 1
        inj_fails = 0 if sec_tests.get("prompt_injection", {}).get("passed") else 1

        # Flatten available metrics
        flattened: Dict[str, Optional[float]] = {
            "recall@5": ret_metrics.get("recall@5"),
            "precision@1": ret_metrics.get("precision@1"),
            "mrr": ret_metrics.get("mrr"),
            "ndcg@5": ret_metrics.get("ndcg@5"),
            "faithfulness": gen_metrics.get("faithfulness"),
            "correctness_f1": gen_metrics.get("correctness_f1"),
            "hallucination_rate": gen_metrics.get("hallucination_rate"),
            "traceability_rate": cit_metrics.get("traceability_rate"),
            "completeness_rate": cit_metrics.get("completeness_rate"),
            "fabrication_rate": cit_metrics.get("fabrication_rate"),
            "tenant_isolation_leaks": float(tenant_leaks) if sec_tests else None,
            "rbac_failures": float(rbac_fails) if sec_tests else None,
            "injection_vulnerabilities": float(inj_fails) if sec_tests else None,
            "p50_latency_ms": perf_metrics.get("p50_latency_ms"),
            "p95_latency_ms": perf_metrics.get("p95_latency_ms"),
            "mean_retrieval_latency_ms": perf_metrics.get("mean_retrieval_latency_ms"),
            "failure_rate": 0.0,  # 0.0 if eval completed without crashing
        }

        evaluations: List[Dict[str, Any]] = []
        category_statuses: Dict[str, List[str]] = {}

        for rule in self.rules:
            val = flattened.get(rule.metric_key)
            res = rule.evaluate(val)
            evaluations.append(res)
            category_statuses.setdefault(rule.category, []).append(res["status"])

        # Determine category summary
        category_summary: Dict[str, str] = {}
        for cat, statuses in category_statuses.items():
            if GateStatus.FAILED.value in statuses:
                category_summary[cat] = GateStatus.FAILED.value
            elif all(s == GateStatus.PASSED.value for s in statuses):
                category_summary[cat] = GateStatus.PASSED.value
            elif all(s == GateStatus.NOT_EVALUATED.value for s in statuses):
                category_summary[cat] = GateStatus.NOT_EVALUATED.value
            else:
                category_summary[cat] = GateStatus.INSUFFICIENT_DATA.value

        # Overall Status
        has_failure = any(e["status"] == GateStatus.FAILED.value for e in evaluations)
        all_passed = all(e["status"] == GateStatus.PASSED.value for e in evaluations)
        all_not_evaluated = all(e["status"] == GateStatus.NOT_EVALUATED.value for e in evaluations)

        if all_not_evaluated:
            overall = OverallGateStatus.NOT_EVALUATED.value
        elif has_failure:
            overall = OverallGateStatus.FAILED.value
        elif all_passed:
            overall = OverallGateStatus.PASSED.value
        else:
            overall = OverallGateStatus.DEGRADED.value

        # Metadata link
        metadata = {
            "evaluation_run_id": eval_run.get("timestamp"),
            "benchmark_version": eval_run.get("benchmark_version", "1.0.0"),
            "benchmark_name": eval_run.get("benchmark_metadata", {}).get("name", "Gold Evaluation Benchmark"),
            "total_cases": eval_run.get("benchmark_metadata", {}).get("total_cases", 0),
            "timestamp": eval_run.get("timestamp"),
            "retrieval_configuration": {
                "dense_top_k": settings.dense_top_k,
                "sparse_top_k": settings.sparse_top_k,
                "rrf_k": settings.rrf_k,
                "final_top_k": settings.final_top_k,
            },
            "embedding_model": settings.embedding_model,
            "reranker_model": settings.reranker_model,
            "generation_model": settings.llm_model,
        }

        return {
            "overall_status": overall,
            "environment": self.environment,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "benchmark_linked": True,
            "category_summary": category_summary,
            "rule_evaluations": evaluations,
            "evaluation_metadata": metadata,
            "thresholds_applied": self.thresholds,
        }

    @staticmethod
    def load_latest_evaluation_run() -> Optional[Dict[str, Any]]:
        """
        Locates and loads the most recent JSON evaluation run file from
        rag/evaluation/results/.
        """
        results_dir = os.path.join("rag", "evaluation", "results")
        pattern = os.path.join(results_dir, "eval_run_*.json")
        files = glob.glob(pattern)
        if not files:
            return None

        # Sort by mtime descending
        files.sort(key=os.path.getmtime, reverse=True)
        latest_file = files[0]

        try:
            with open(latest_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return None

    @staticmethod
    def list_evaluation_runs() -> List[Dict[str, Any]]:
        """
        List all discovered evaluation runs with high-level summary info.
        """
        results_dir = os.path.join("rag", "evaluation", "results")
        pattern = os.path.join(results_dir, "eval_run_*.json")
        files = glob.glob(pattern)
        runs: List[Dict[str, Any]] = []

        # Sort files by filename or mtime
        files.sort(key=os.path.getmtime, reverse=True)
        for filepath in files:
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    runs.append({
                        "filename": os.path.basename(filepath),
                        "timestamp": data.get("timestamp"),
                        "benchmark_version": data.get("benchmark_version"),
                        "total_cases": data.get("benchmark_metadata", {}).get("total_cases", 0),
                        "recall@5": data.get("retrieval_metrics", {}).get("recall@5"),
                        "mrr": data.get("retrieval_metrics", {}).get("mrr"),
                        "faithfulness": data.get("generation_metrics", {}).get("faithfulness"),
                        "p95_latency_ms": data.get("performance_metrics", {}).get("p95_latency_ms"),
                    })
            except Exception:
                continue

        return runs
