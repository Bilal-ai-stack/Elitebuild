# =============================================================================
# ELITEBUILD RAG — Quality Regression Detection (Step 15)
# =============================================================================
# Compares evaluation runs to detect performance, retrieval, and accuracy
# regressions across benchmark versions.
#
# Typed Regression Statuses:
#   IMPROVED | STABLE | REGRESSED | NOT_COMPARABLE | INSUFFICIENT_DATA
#
# Only labels something as regression when actual comparable data exists.
# =============================================================================

import glob
import json
import os
from enum import Enum
from typing import Any, Dict, List, Optional


class RegressionStatus(str, Enum):
    IMPROVED = "IMPROVED"
    STABLE = "STABLE"
    REGRESSED = "REGRESSED"
    NOT_COMPARABLE = "NOT_COMPARABLE"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"


class QualityRegressionDetector:
    """
    Compares two evaluation runs and identifies regressions against tolerance thresholds.
    """

    DEFAULT_THRESHOLDS = {
        "recall_tolerance": -0.05,        # Warning if Recall drops by >= 0.05
        "precision_tolerance": -0.05,     # Warning if Precision drops by >= 0.05
        "mrr_tolerance": -0.05,           # Warning if MRR drops by >= 0.05
        "ndcg_tolerance": -0.05,          # Warning if NDCG drops by >= 0.05
        "faithfulness_tolerance": -0.05,  # Warning if Faithfulness drops by >= 0.05
        "hallucination_tolerance": 0.05,  # Warning if Hallucination increases by >= 0.05
        "citation_tolerance": -0.02,      # Warning if citation traceability drops
        "latency_p95_ratio_max": 1.5,     # Warning if p95 latency jumps by > 50%
    }

    def __init__(self, thresholds: Optional[Dict[str, float]] = None):
        self.thresholds = {**self.DEFAULT_THRESHOLDS, **(thresholds or {})}

    def compare_runs(
        self,
        baseline_run: Optional[Dict[str, Any]],
        candidate_run: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Compare baseline evaluation run against candidate evaluation run.
        Returns typed RegressionStatus and detailed breakdown.
        """
        if baseline_run is None or candidate_run is None:
            return {
                "overall_status": RegressionStatus.INSUFFICIENT_DATA.value,
                "has_regressions": False,
                "regressions_count": 0,
                "improvements_count": 0,
                "message": "Insufficient data: both baseline and candidate runs are required for regression comparison.",
                "regressions": [],
                "improvements": [],
            }

        # Check comparability (e.g. benchmark version compatibility)
        base_ver = baseline_run.get("benchmark_version")
        cand_ver = candidate_run.get("benchmark_version")
        if base_ver and cand_ver and base_ver.split(".")[0] != cand_ver.split(".")[0]:
            return {
                "overall_status": RegressionStatus.NOT_COMPARABLE.value,
                "has_regressions": False,
                "regressions_count": 0,
                "improvements_count": 0,
                "message": f"Runs are NOT_COMPARABLE due to major benchmark version mismatch ({base_ver} vs {cand_ver}).",
                "regressions": [],
                "improvements": [],
            }

        regressions: List[Dict[str, Any]] = []
        improvements: List[Dict[str, Any]] = []

        base_ret = baseline_run.get("retrieval_metrics", {})
        cand_ret = candidate_run.get("retrieval_metrics", {})

        base_gen = baseline_run.get("generation_metrics", {})
        cand_gen = candidate_run.get("generation_metrics", {})

        base_cit = baseline_run.get("citation_metrics", {})
        cand_cit = candidate_run.get("citation_metrics", {})

        base_perf = baseline_run.get("performance_metrics", {})
        cand_perf = candidate_run.get("performance_metrics", {})

        # 1. Retrieval Checks
        for metric in ["recall@3", "recall@5", "recall@10", "mrr", "ndcg@5"]:
            v_base = base_ret.get(metric)
            v_cand = cand_ret.get(metric)
            if v_base is not None and v_cand is not None:
                delta = round(v_cand - v_base, 4)
                if delta <= self.thresholds.get("recall_tolerance", -0.05):
                    regressions.append({
                        "metric": metric,
                        "component": "retrieval",
                        "baseline": v_base,
                        "candidate": v_cand,
                        "delta": delta,
                        "severity": "CRITICAL" if delta < -0.10 else "WARNING",
                        "description": f"{metric} dropped by {abs(delta):.4f}",
                    })
                elif delta >= 0.02:
                    improvements.append({
                        "metric": metric,
                        "component": "retrieval",
                        "baseline": v_base,
                        "candidate": v_cand,
                        "delta": delta,
                    })

        # 2. Generation & Hallucination Checks
        for metric in ["faithfulness", "correctness_f1"]:
            v_base = base_gen.get(metric)
            v_cand = cand_gen.get(metric)
            if v_base is not None and v_cand is not None:
                delta = round(v_cand - v_base, 4)
                if delta <= self.thresholds.get("faithfulness_tolerance", -0.05):
                    regressions.append({
                        "metric": metric,
                        "component": "generation",
                        "baseline": v_base,
                        "candidate": v_cand,
                        "delta": delta,
                        "severity": "CRITICAL" if delta < -0.10 else "WARNING",
                        "description": f"{metric} decreased by {abs(delta):.4f}",
                    })
                elif delta >= 0.02:
                    improvements.append({
                        "metric": metric,
                        "component": "generation",
                        "baseline": v_base,
                        "candidate": v_cand,
                        "delta": delta,
                    })

        # Hallucination rate (lower is better)
        h_base = base_gen.get("hallucination_rate")
        h_cand = cand_gen.get("hallucination_rate")
        if h_base is not None and h_cand is not None:
            delta = round(h_cand - h_base, 4)
            if delta >= self.thresholds.get("hallucination_tolerance", 0.05):
                regressions.append({
                    "metric": "hallucination_rate",
                    "component": "generation",
                    "baseline": h_base,
                    "candidate": h_cand,
                    "delta": delta,
                    "severity": "CRITICAL",
                    "description": f"Hallucination rate increased by {delta:.4f}",
                })
            elif delta <= -0.02:
                improvements.append({
                    "metric": "hallucination_rate",
                    "component": "generation",
                    "baseline": h_base,
                    "candidate": h_cand,
                    "delta": delta,
                })

        # 3. Citation Checks
        for metric in ["traceability_rate", "completeness_rate"]:
            v_base = base_cit.get(metric)
            v_cand = cand_cit.get(metric)
            if v_base is not None and v_cand is not None:
                delta = round(v_cand - v_base, 4)
                if delta <= self.thresholds.get("citation_tolerance", -0.02):
                    regressions.append({
                        "metric": metric,
                        "component": "citation",
                        "baseline": v_base,
                        "candidate": v_cand,
                        "delta": delta,
                        "severity": "CRITICAL",
                        "description": f"Citation {metric} degraded by {abs(delta):.4f}",
                    })

        # 4. Latency Checks
        p95_base = base_perf.get("p95_latency_ms")
        p95_cand = cand_perf.get("p95_latency_ms")
        if isinstance(p95_base, (int, float)) and isinstance(p95_cand, (int, float)) and p95_base > 0:
            ratio = p95_cand / p95_base
            if ratio >= self.thresholds.get("latency_p95_ratio_max", 1.5):
                regressions.append({
                    "metric": "p95_latency_ms",
                    "component": "performance",
                    "baseline": p95_base,
                    "candidate": p95_cand,
                    "ratio": round(ratio, 2),
                    "severity": "WARNING",
                    "description": f"p95 latency increased by {(ratio - 1.0)*100:.1f}%",
                })

        # Determine typed overall regression status
        if len(regressions) > 0:
            overall_status = RegressionStatus.REGRESSED.value
        elif len(improvements) > 0:
            overall_status = RegressionStatus.IMPROVED.value
        else:
            overall_status = RegressionStatus.STABLE.value

        return {
            "overall_status": overall_status,
            "baseline_run_id": baseline_run.get("timestamp"),
            "candidate_run_id": candidate_run.get("timestamp"),
            "benchmark_version": cand_ver or base_ver or "1.0.0",
            "has_regressions": len(regressions) > 0,
            "regressions_count": len(regressions),
            "improvements_count": len(improvements),
            "regressions": regressions,
            "improvements": improvements,
        }

    @classmethod
    def auto_detect_latest_comparison(cls) -> Dict[str, Any]:
        """
        Locates the two most recent evaluation runs in rag/evaluation/results/
        and executes an automated regression analysis.
        """
        results_dir = os.path.join("rag", "evaluation", "results")
        pattern = os.path.join(results_dir, "eval_run_*.json")
        files = glob.glob(pattern)

        if len(files) < 2:
            return {
                "overall_status": RegressionStatus.INSUFFICIENT_DATA.value,
                "has_regressions": False,
                "regressions_count": 0,
                "improvements_count": 0,
                "message": f"Insufficient data for regression detection ({len(files)} run(s) found, minimum 2 required).",
                "regressions": [],
                "improvements": [],
            }

        files.sort(key=os.path.getmtime, reverse=True)
        cand_file = files[0]
        base_file = files[1]

        try:
            with open(base_file, "r", encoding="utf-8") as f:
                base_data = json.load(f)
            with open(cand_file, "r", encoding="utf-8") as f:
                cand_data = json.load(f)
            detector = cls()
            res = detector.compare_runs(base_data, cand_data)
            res["baseline_file"] = os.path.basename(base_file)
            res["candidate_file"] = os.path.basename(cand_file)
            return res
        except Exception as e:
            return {
                "overall_status": RegressionStatus.INSUFFICIENT_DATA.value,
                "has_regressions": False,
                "regressions_count": 0,
                "improvements_count": 0,
                "message": f"Error loading evaluation runs for comparison: {str(e)}",
                "regressions": [],
                "improvements": [],
            }

    def compare_from_files(self, baseline_path: str, candidate_path: str) -> Dict[str, Any]:
        """Load JSON evaluation runs from file paths and execute regression detection."""
        with open(baseline_path, "r", encoding="utf-8") as f:
            base_data = json.load(f)
        with open(candidate_path, "r", encoding="utf-8") as f:
            cand_data = json.load(f)
        result = self.compare_runs(base_data, cand_data)
        result["regression_detected"] = result["has_regressions"]
        result["summary"] = f"{result['overall_status']}: {result['regressions_count']} regression(s), {result['improvements_count']} improvement(s)"
        for r in result.get("regressions", []):
            r["relative_change"] = f"{r['delta']:+.4f}"
        for imp in result.get("improvements", []):
            imp["relative_change"] = f"{imp['delta']:+.4f}"
        return result
