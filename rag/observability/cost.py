# =============================================================================
# ELITEBUILD RAG — Cost Calculation & Tracking Engine
# =============================================================================
# Transparently calculates inference and embedding costs based on verified
# provider pricing tables. Distinguishes MEASURED, ESTIMATED, and NOT_AVAILABLE.
# =============================================================================

from typing import Dict, Optional, Tuple
from rag.observability.events import MetricState

# Provider pricing per 1,000 tokens (USD)
# Source: Official published rates
MODEL_PRICING: Dict[str, Dict[str, float]] = {
    # OpenAI
    "gpt-4o-mini": {
        "input_per_1k": 0.00015,
        "output_per_1k": 0.00060,
    },
    "gpt-4o": {
        "input_per_1k": 0.0025,
        "output_per_1k": 0.0100,
    },
    "text-embedding-3-small": {
        "input_per_1k": 0.00002,
        "output_per_1k": 0.0,
    },
    "text-embedding-3-large": {
        "input_per_1k": 0.00013,
        "output_per_1k": 0.0,
    },
    # Groq Cloud
    "llama-3.3-70b-versatile": {
        "input_per_1k": 0.00059,
        "output_per_1k": 0.00079,
    },
    "llama-3.1-70b-versatile": {
        "input_per_1k": 0.00059,
        "output_per_1k": 0.00079,
    },
    "llama-3.1-8b-instant": {
        "input_per_1k": 0.00005,
        "output_per_1k": 0.00008,
    },
    "mixtral-8x7b-32768": {
        "input_per_1k": 0.00024,
        "output_per_1k": 0.00024,
    },
}


def calculate_request_cost(
    model: str,
    input_tokens: int,
    output_tokens: int,
    is_estimated_tokens: bool = False,
) -> Tuple[float, MetricState]:
    """
    Calculate query cost in USD and return the measurement certainty state.

    Returns:
        (cost_usd, MetricState)
    """
    pricing = MODEL_PRICING.get(model.lower())
    if not pricing:
        return 0.0, MetricState.NOT_AVAILABLE

    input_cost = (input_tokens / 1000.0) * pricing["input_per_1k"]
    output_cost = (output_tokens / 1000.0) * pricing["output_per_1k"]
    total = input_cost + output_cost

    state = MetricState.ESTIMATED if is_estimated_tokens else MetricState.MEASURED
    return round(total, 6), state


def estimate_tokens_from_chars(text: str) -> int:
    """
    Heuristic: ~4 characters per token in English.
    """
    if not text:
        return 0
    return max(1, len(text) // 4)
