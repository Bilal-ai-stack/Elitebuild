# =============================================================================
# ELITEBUILD RAG — LLM Provider Abstraction
# =============================================================================
# Provider-agnostic LLM interface with OpenAI and mock implementations.
# No API keys in source code. Configurable model, temperature, timeout.
# =============================================================================

import os
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional

from rag.config.settings import settings
from rag.observability.logger import get_rag_logger

logger = get_rag_logger("elitebuild.rag.generation.llm")


# ---------------------------------------------------------------------------
# LLM Response
# ---------------------------------------------------------------------------

@dataclass
class LLMResponse:
    """Structured response from an LLM provider."""
    text: str
    model: str
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    latency_ms: float = 0.0
    finish_reason: str = "stop"
    error: Optional[str] = None

    @property
    def estimated_cost_usd(self) -> float:
        """Rough cost estimate based on model pricing. Returns 0 if unknown."""
        # Approximate pricing for common models (per 1M tokens)
        pricing = {
            # OpenAI models
            "gpt-4o-mini": {"input": 0.15, "output": 0.60},
            "gpt-4o": {"input": 2.50, "output": 10.00},
            "gpt-4-turbo": {"input": 10.00, "output": 30.00},
            # Groq Cloud models
            "llama-3.3-70b-versatile": {"input": 0.59, "output": 0.79},
            "llama-3.1-70b-versatile": {"input": 0.59, "output": 0.79},
            "llama-3.1-8b-instant": {"input": 0.05, "output": 0.08},
            "llama3-70b-8192": {"input": 0.59, "output": 0.79},
            "llama3-8b-8192": {"input": 0.05, "output": 0.08},
            "mixtral-8x7b-32768": {"input": 0.24, "output": 0.24},
            "gemma2-9b-it": {"input": 0.20, "output": 0.20},
        }
        model_prices = pricing.get(self.model)
        if not model_prices:
            return 0.0
        input_cost = (self.input_tokens / 1_000_000) * model_prices["input"]
        output_cost = (self.output_tokens / 1_000_000) * model_prices["output"]
        return round(input_cost + output_cost, 8)


# ---------------------------------------------------------------------------
# Abstract LLM Provider
# ---------------------------------------------------------------------------

class LLMProvider(ABC):
    """Abstract interface for LLM providers."""

    @abstractmethod
    def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.0,
        max_tokens: int = 2000,
        timeout_seconds: int = 30,
    ) -> LLMResponse:
        """Generate a completion from system + user prompt."""
        ...

    @abstractmethod
    def get_model_name(self) -> str:
        ...


# ---------------------------------------------------------------------------
# OpenAI LLM Provider
# ---------------------------------------------------------------------------

class OpenAILLMProvider(LLMProvider):
    """
    LLM provider using OpenAI Chat Completions API.
    Requires OPENAI_API_KEY environment variable.
    """

    def __init__(
        self,
        model: str = "",
        api_key: str = "",
        max_retries: int = 3,
    ):
        self.model = model or settings.llm_model
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY", "")
        self.max_retries = max_retries
        self._client = None

    def _get_client(self):
        if self._client is None:
            if not self.api_key:
                raise ValueError(
                    "OPENAI_API_KEY environment variable is required. "
                    "Set it in .env or use LLM_PROVIDER=mock for development."
                )
            try:
                from openai import OpenAI
                self._client = OpenAI(api_key=self.api_key, timeout=60.0)
            except ImportError:
                raise ImportError("openai package required. Install: pip install openai")
        return self._client

    def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.0,
        max_tokens: int = 2000,
        timeout_seconds: int = 30,
    ) -> LLMResponse:
        start = time.time()

        for attempt in range(self.max_retries):
            try:
                client = self._get_client()
                response = client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=temperature,
                    max_tokens=max_tokens,
                )

                elapsed_ms = (time.time() - start) * 1000
                choice = response.choices[0]
                usage = response.usage

                result = LLMResponse(
                    text=choice.message.content or "",
                    model=self.model,
                    input_tokens=usage.prompt_tokens if usage else 0,
                    output_tokens=usage.completion_tokens if usage else 0,
                    total_tokens=usage.total_tokens if usage else 0,
                    latency_ms=elapsed_ms,
                    finish_reason=choice.finish_reason or "stop",
                )

                logger.info(
                    f"LLM generation complete ({self.model}) in {elapsed_ms:.1f}ms, "
                    f"{result.total_tokens} tokens",
                    extra={"telemetry": {
                        "event_type": "llm_generation_complete",
                        "model": self.model,
                        "input_tokens": result.input_tokens,
                        "output_tokens": result.output_tokens,
                        "latency_ms": round(elapsed_ms, 2),
                    }}
                )
                return result

            except Exception as e:
                error_str = str(e)
                if isinstance(e, (ValueError, ImportError)) or "api_key" in error_str.lower():
                    elapsed_ms = (time.time() - start) * 1000
                    logger.error(f"LLM generation failed: {e}")
                    return LLMResponse(
                        text="",
                        model=self.model,
                        latency_ms=elapsed_ms,
                        finish_reason="error",
                        error=error_str,
                    )
                if attempt < self.max_retries - 1:
                    wait = 2 ** attempt
                    logger.warning(
                        f"LLM attempt {attempt+1} failed: {e}. Retrying in {wait}s..."
                    )
                    time.sleep(wait)
                else:
                    elapsed_ms = (time.time() - start) * 1000
                    logger.error(f"LLM generation failed after {self.max_retries} attempts: {e}")
                    return LLMResponse(
                        text="",
                        model=self.model,
                        latency_ms=elapsed_ms,
                        finish_reason="error",
                        error=str(e),
                    )

        # Unreachable
        return LLMResponse(text="", model=self.model, error="max_retries_exceeded")

    def get_model_name(self) -> str:
        return self.model


# ---------------------------------------------------------------------------
# Groq Cloud LLM Provider
# ---------------------------------------------------------------------------

class GroqLLMProvider(LLMProvider):
    """
    LLM provider using Groq Cloud API for ultra-low latency inference.
    Requires GROQ_API_KEY environment variable or constructor argument.
    Supports configurable models with default to llama-3.3-70b-versatile.
    """

    DEFAULT_MODEL = "llama-3.3-70b-versatile"
    SUPPORTED_MODELS = [
        "llama-3.3-70b-versatile",
        "llama-3.1-70b-versatile",
        "llama-3.1-8b-instant",
        "llama3-70b-8192",
        "llama3-8b-8192",
        "mixtral-8x7b-32768",
        "gemma2-9b-it",
    ]

    def __init__(
        self,
        model: str = "",
        api_key: str = "",
        max_retries: int = 3,
    ):
        configured_model = (
            model
            or os.environ.get("GROQ_MODEL")
            or getattr(settings, "groq_model", "")
            or (settings.llm_model if getattr(settings, "llm_provider", "") == "groq" else "")
            or self.DEFAULT_MODEL
        )
        self.model = configured_model
        self.api_key = (
            api_key
            or os.environ.get("GROQ_API_KEY", "")
            or (getattr(settings, "groq_api_key", None) or "")
        )
        self.max_retries = max_retries
        self._client = None

    def _get_client(self):
        if self._client is None:
            if not self.api_key:
                raise ValueError(
                    "GROQ_API_KEY environment variable is required. "
                    "Set it in .env or use LLM_PROVIDER=mock for development."
                )
            try:
                from groq import Groq
                self._client = Groq(api_key=self.api_key, timeout=60.0)
            except ImportError:
                raise ImportError("groq package required. Install: pip install groq")
        return self._client

    def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.0,
        max_tokens: int = 2000,
        timeout_seconds: int = 30,
    ) -> LLMResponse:
        start = time.time()

        for attempt in range(self.max_retries):
            try:
                client = self._get_client()
                response = client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=temperature,
                    max_tokens=max_tokens,
                )

                elapsed_ms = (time.time() - start) * 1000
                choice = response.choices[0]
                usage = response.usage

                result = LLMResponse(
                    text=choice.message.content or "",
                    model=self.model,
                    input_tokens=usage.prompt_tokens if usage else 0,
                    output_tokens=usage.completion_tokens if usage else 0,
                    total_tokens=usage.total_tokens if usage else 0,
                    latency_ms=elapsed_ms,
                    finish_reason=choice.finish_reason or "stop",
                )

                logger.info(
                    f"Groq LLM generation complete ({self.model}) in {elapsed_ms:.1f}ms, "
                    f"{result.total_tokens} tokens",
                    extra={"telemetry": {
                        "event_type": "llm_generation_complete",
                        "provider": "groq",
                        "model": self.model,
                        "input_tokens": result.input_tokens,
                        "output_tokens": result.output_tokens,
                        "latency_ms": round(elapsed_ms, 2),
                    }}
                )
                return result

            except Exception as e:
                error_str = str(e)
                error_type = type(e).__name__
                is_non_retryable = (
                    isinstance(e, (ValueError, ImportError))
                    or "AuthenticationError" in error_type
                    or "NotFoundError" in error_type
                    or "BadRequestError" in error_type
                    or "401" in error_str
                    or "404" in error_str
                    or "400" in error_str
                )

                if is_non_retryable or attempt >= self.max_retries - 1:
                    elapsed_ms = (time.time() - start) * 1000
                    logger.error(f"Groq LLM generation failed: {e}")
                    return LLMResponse(
                        text="",
                        model=self.model,
                        latency_ms=elapsed_ms,
                        finish_reason="error",
                        error=error_str,
                    )

                wait = 2 ** attempt
                logger.warning(
                    f"Groq LLM attempt {attempt+1} failed: {e}. Retrying in {wait}s..."
                )
                time.sleep(wait)

        return LLMResponse(text="", model=self.model, error="max_retries_exceeded", finish_reason="error")

    def get_model_name(self) -> str:
        return self.model


# ---------------------------------------------------------------------------
# Mock LLM Provider (for development / testing)
# ---------------------------------------------------------------------------

class MockLLMProvider(LLMProvider):
    """
    Deterministic mock LLM provider for development and testing.
    Returns structured responses based on evidence in the prompt.
    """

    def __init__(self, model: str = "mock-llm-v1"):
        self.model = model

    def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.0,
        max_tokens: int = 2000,
        timeout_seconds: int = 30,
    ) -> LLMResponse:
        start = time.time()

        # Generate a controlled mock response based on evidence presence
        if "<verified_evidence>" in user_prompt and "No evidence retrieved" not in user_prompt:
            # Extract citation numbers from the evidence
            import re
            citations = re.findall(r'\[(\d+)\]', user_prompt)
            unique_citations = sorted(set(int(c) for c in citations))

            # Build a grounded mock answer
            answer_parts = ["Based on the verified ELITEBUILD knowledge base:"]
            for idx in unique_citations[:3]:  # Use up to 3 citations
                answer_parts.append(
                    f"According to the evidence [{idx}], the retrieved records "
                    f"contain relevant information about the queried topic."
                )

            if len(unique_citations) > 3:
                remaining = unique_citations[3:]
                refs = ", ".join(f"[{c}]" for c in remaining)
                answer_parts.append(
                    f"Additional supporting evidence is available in {refs}."
                )

            answer = "\n\n".join(answer_parts)
        else:
            answer = (
                "The available ELITEBUILD knowledge base does not contain "
                "sufficient verified information to answer this question."
            )

        elapsed_ms = (time.time() - start) * 1000

        # Simulate realistic token counts
        input_tokens = len(system_prompt.split()) + len(user_prompt.split())
        output_tokens = len(answer.split())

        return LLMResponse(
            text=answer,
            model=self.model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=input_tokens + output_tokens,
            latency_ms=elapsed_ms,
            finish_reason="stop",
        )

    def get_model_name(self) -> str:
        return self.model


# ---------------------------------------------------------------------------
# Failing Mock LLM Provider (for failure testing)
# ---------------------------------------------------------------------------

class FailingLLMProvider(LLMProvider):
    """Mock that always fails — for testing LLM failure handling."""

    def generate(self, system_prompt, user_prompt, **kwargs) -> LLMResponse:
        return LLMResponse(
            text="",
            model="failing-mock",
            latency_ms=0.0,
            finish_reason="error",
            error="Simulated provider failure: service unavailable",
        )

    def get_model_name(self) -> str:
        return "failing-mock"


# ---------------------------------------------------------------------------
# Provider Factory
# ---------------------------------------------------------------------------

def get_llm_provider(provider: str = "", model: str = "") -> LLMProvider:
    """
    Factory function returning the configured LLM provider.

    Supported providers:
      - "openai": OpenAI Chat Completions (requires OPENAI_API_KEY)
      - "groq": Groq Cloud API (requires GROQ_API_KEY)
      - "mock": Deterministic mock for development/testing
    """
    provider_name = (provider or settings.llm_provider).lower().strip()

    if provider_name == "openai":
        return OpenAILLMProvider(model=model)
    elif provider_name == "groq":
        return GroqLLMProvider(model=model)
    elif provider_name == "mock":
        return MockLLMProvider()
    else:
        logger.warning(f"Unknown LLM provider '{provider_name}', falling back to mock")
        return MockLLMProvider()
