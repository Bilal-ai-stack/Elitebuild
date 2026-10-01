# =============================================================================
# ELITEBUILD RAG — Groq Cloud API Provider Tests
# =============================================================================
# Verifies:
# 1. GroqLLMProvider initialization & model selection
# 2. API key resolution (explicit, environment variable, settings)
# 3. Missing API key graceful handling
# 4. Successful generation with mocked client
# 5. API error and invalid model handling
# 6. Pricing and telemetry calculation for Groq models
# 7. Provider factory (get_llm_provider) integration
# 8. End-to-end integration with GroundedAnswerGenerator
# =============================================================================

import os
import sys
from unittest.mock import MagicMock, patch

import pytest

# Ensure project root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from rag.config.settings import settings
from rag.generation.llm_provider import (
    GroqLLMProvider,
    OpenAILLMProvider,
    MockLLMProvider,
    LLMResponse,
    get_llm_provider,
)
from rag.generation.generator import GroundedAnswerGenerator
from rag.retrieval.engine import RetrievalResult


class TestGroqLLMProviderInitialization:
    """Tests for GroqLLMProvider configuration and model selection."""

    def test_default_model(self):
        provider = GroqLLMProvider(api_key="test-key")
        assert provider.get_model_name() == "llama-3.3-70b-versatile"
        assert provider.model == "llama-3.3-70b-versatile"

    def test_explicit_model_selection(self):
        provider = GroqLLMProvider(model="llama-3.1-8b-instant", api_key="test-key")
        assert provider.get_model_name() == "llama-3.1-8b-instant"

    def test_env_var_model_selection(self, monkeypatch):
        monkeypatch.setenv("GROQ_MODEL", "mixtral-8x7b-32768")
        provider = GroqLLMProvider(api_key="test-key")
        assert provider.get_model_name() == "mixtral-8x7b-32768"

    def test_explicit_api_key(self):
        provider = GroqLLMProvider(api_key="my-custom-groq-key")
        assert provider.api_key == "my-custom-groq-key"

    def test_env_var_api_key(self, monkeypatch):
        monkeypatch.setenv("GROQ_API_KEY", "env-groq-key-12345")
        provider = GroqLLMProvider()
        assert provider.api_key == "env-groq-key-12345"

    def test_supported_models_list(self):
        assert "llama-3.3-70b-versatile" in GroqLLMProvider.SUPPORTED_MODELS
        assert "llama-3.1-8b-instant" in GroqLLMProvider.SUPPORTED_MODELS
        assert "mixtral-8x7b-32768" in GroqLLMProvider.SUPPORTED_MODELS


class TestGroqLLMProviderKeyAndClientHandling:
    """Tests for missing key and client initialization."""

    def test_missing_api_key_raises_in_get_client(self, monkeypatch):
        monkeypatch.delenv("GROQ_API_KEY", raising=False)
        provider = GroqLLMProvider(api_key="")
        with pytest.raises(ValueError, match="GROQ_API_KEY environment variable is required"):
            provider._get_client()

    def test_missing_api_key_handled_gracefully_in_generate(self, monkeypatch):
        monkeypatch.delenv("GROQ_API_KEY", raising=False)
        provider = GroqLLMProvider(api_key="")
        response = provider.generate(
            system_prompt="You are a helpful assistant.",
            user_prompt="Hello",
        )
        assert response.finish_reason == "error"
        assert response.error is not None
        assert "GROQ_API_KEY" in response.error
        assert response.text == ""

    def test_missing_groq_package_handled_gracefully(self):
        provider = GroqLLMProvider(api_key="test-key")
        with patch.dict(sys.modules, {"groq": None}):
            # Simulate groq package import failure
            with patch("builtins.__import__", side_effect=ImportError("No module named 'groq'")):
                response = provider.generate(
                    system_prompt="Test prompt",
                    user_prompt="Hello",
                )
                assert response.finish_reason == "error"
                assert "groq package required" in response.error or "No module named" in response.error


class TestGroqLLMProviderGeneration:
    """Tests for successful generation using mocked Groq client."""

    def test_successful_generation(self):
        provider = GroqLLMProvider(model="llama-3.3-70b-versatile", api_key="test-key")

        mock_choice = MagicMock()
        mock_choice.message.content = "Elite Construction Company was founded in 2006."
        mock_choice.finish_reason = "stop"

        mock_usage = MagicMock()
        mock_usage.prompt_tokens = 45
        mock_usage.completion_tokens = 12
        mock_usage.total_tokens = 57

        mock_response = MagicMock()
        mock_response.choices = [mock_choice]
        mock_response.usage = mock_usage

        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = mock_response
        provider._client = mock_client

        result = provider.generate(
            system_prompt="Grounding rules here.",
            user_prompt="When was Elite founded?",
            temperature=0.0,
            max_tokens=500,
        )

        assert result.text == "Elite Construction Company was founded in 2006."
        assert result.model == "llama-3.3-70b-versatile"
        assert result.input_tokens == 45
        assert result.output_tokens == 12
        assert result.total_tokens == 57
        assert result.finish_reason == "stop"
        assert result.error is None
        assert result.latency_ms > 0

        # Verify chat completion call arguments
        mock_client.chat.completions.create.assert_called_once_with(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "Grounding rules here."},
                {"role": "user", "content": "When was Elite founded?"},
            ],
            temperature=0.0,
            max_tokens=500,
        )

    def test_cost_estimation_for_groq_models(self):
        # llama-3.3-70b-versatile: $0.59 input, $0.79 output per 1M tokens
        resp_70b = LLMResponse(
            text="answer",
            model="llama-3.3-70b-versatile",
            input_tokens=1_000_000,
            output_tokens=1_000_000,
        )
        assert resp_70b.estimated_cost_usd == pytest.approx(1.38, rel=1e-4)

        # llama-3.1-8b-instant: $0.05 input, $0.08 output per 1M tokens
        resp_8b = LLMResponse(
            text="answer",
            model="llama-3.1-8b-instant",
            input_tokens=1_000_000,
            output_tokens=1_000_000,
        )
        assert resp_8b.estimated_cost_usd == pytest.approx(0.13, rel=1e-4)

        # mixtral-8x7b-32768: $0.24 input, $0.24 output per 1M tokens
        resp_mix = LLMResponse(
            text="answer",
            model="mixtral-8x7b-32768",
            input_tokens=1_000_000,
            output_tokens=1_000_000,
        )
        assert resp_mix.estimated_cost_usd == pytest.approx(0.48, rel=1e-4)


class TestGroqLLMProviderErrorHandling:
    """Tests for API errors, bad requests, invalid models, and retries."""

    def test_invalid_model_or_bad_request_fails_fast(self):
        provider = GroqLLMProvider(model="invalid-groq-model-xyz", api_key="test-key", max_retries=3)

        mock_client = MagicMock()
        # Simulate 400 Bad Request / NotFoundError
        mock_client.chat.completions.create.side_effect = Exception("BadRequestError: model_not_found (404)")
        provider._client = mock_client

        result = provider.generate("system", "user")

        assert result.finish_reason == "error"
        assert "BadRequestError" in result.error
        # Must fail fast without running 3 retries
        assert mock_client.chat.completions.create.call_count == 1

    def test_authentication_error_fails_fast(self):
        provider = GroqLLMProvider(api_key="bad-key", max_retries=3)

        mock_client = MagicMock()
        mock_client.chat.completions.create.side_effect = Exception("AuthenticationError: invalid_api_key (401)")
        provider._client = mock_client

        result = provider.generate("system", "user")

        assert result.finish_reason == "error"
        assert "AuthenticationError" in result.error
        assert mock_client.chat.completions.create.call_count == 1

    def test_transient_error_retry_success(self):
        provider = GroqLLMProvider(api_key="test-key", max_retries=3)

        mock_choice = MagicMock()
        mock_choice.message.content = "Success on retry"
        mock_choice.finish_reason = "stop"
        mock_usage = MagicMock(prompt_tokens=10, completion_tokens=5, total_tokens=15)
        success_response = MagicMock(choices=[mock_choice], usage=mock_usage)

        mock_client = MagicMock()
        # First call fails with transient network error, second call succeeds
        mock_client.chat.completions.create.side_effect = [
            Exception("Connection reset by peer"),
            success_response,
        ]
        provider._client = mock_client

        with patch("time.sleep"):  # Avoid test delays
            result = provider.generate("system", "user")

        assert result.text == "Success on retry"
        assert result.finish_reason == "stop"
        assert mock_client.chat.completions.create.call_count == 2

    def test_exhausted_retries_returns_error_response(self):
        provider = GroqLLMProvider(api_key="test-key", max_retries=2)

        mock_client = MagicMock()
        mock_client.chat.completions.create.side_effect = Exception("Persistent gateway timeout")
        provider._client = mock_client

        with patch("time.sleep"):
            result = provider.generate("system", "user")

        assert result.finish_reason == "error"
        assert "Persistent gateway timeout" in result.error
        assert mock_client.chat.completions.create.call_count == 2


class TestProviderFactory:
    """Tests for get_llm_provider factory function."""

    def test_get_llm_provider_groq(self):
        provider = get_llm_provider("groq")
        assert isinstance(provider, GroqLLMProvider)
        assert provider.get_model_name() == "llama-3.3-70b-versatile"

    def test_get_llm_provider_groq_with_custom_model(self):
        provider = get_llm_provider("groq", model="llama-3.1-8b-instant")
        assert isinstance(provider, GroqLLMProvider)
        assert provider.get_model_name() == "llama-3.1-8b-instant"

    def test_get_llm_provider_openai(self):
        provider = get_llm_provider("openai")
        assert isinstance(provider, OpenAILLMProvider)

    def test_get_llm_provider_mock(self):
        provider = get_llm_provider("mock")
        assert isinstance(provider, MockLLMProvider)

    def test_get_llm_provider_unknown_fallback(self):
        provider = get_llm_provider("some-unsupported-provider")
        assert isinstance(provider, MockLLMProvider)


class TestGroundedAnswerGeneratorWithGroq:
    """Tests integration of GroqLLMProvider with GroundedAnswerGenerator."""

    def _sample_retrieval_results(self):
        return [
            RetrievalResult(
                chunk_id="chk-001",
                document_id="doc-company",
                document_version="1.0",
                chunk_index=0,
                chunk_text="Elite Construction Company operates in civil and electrical engineering.",
                heading_path="Company > Services",
                source_authority="VERIFIED_COMPANY_RECORD",
                security_access_level="PUBLIC",
                jurisdiction="PK",
                reranker_score=0.88,
                score=0.88,
            )
        ]

    def test_generator_with_groq_success(self):
        groq_provider = GroqLLMProvider(api_key="test-key")

        mock_choice = MagicMock()
        mock_choice.message.content = "Elite Construction Company specializes in civil engineering [1]."
        mock_choice.finish_reason = "stop"
        mock_usage = MagicMock(prompt_tokens=120, completion_tokens=15, total_tokens=135)
        mock_response = MagicMock(choices=[mock_choice], usage=mock_usage)

        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = mock_response
        groq_provider._client = mock_client

        generator = GroundedAnswerGenerator(llm_provider=groq_provider)
        gen_result = generator.generate(
            query="What does Elite do?",
            retrieval_results=self._sample_retrieval_results(),
        )

        assert gen_result.status == "SUPPORTED"
        assert "Elite Construction Company" in gen_result.answer
        assert len(gen_result.citations) >= 1
        assert gen_result.model == "llama-3.3-70b-versatile"
        assert gen_result.llm_error is None

    def test_generator_with_groq_failure_fallback(self):
        groq_provider = GroqLLMProvider(api_key="test-key")

        mock_client = MagicMock()
        mock_client.chat.completions.create.side_effect = Exception("Groq rate limit exceeded (429)")
        groq_provider._client = mock_client

        with patch("time.sleep"):
            generator = GroundedAnswerGenerator(llm_provider=groq_provider)
            gen_result = generator.generate(
                query="What does Elite do?",
                retrieval_results=self._sample_retrieval_results(),
            )

        # Pipeline returns graceful fallback message, no crash
        assert "Answer generation is currently unavailable" in gen_result.answer
        assert gen_result.llm_error is not None
        assert "429" in gen_result.llm_error
