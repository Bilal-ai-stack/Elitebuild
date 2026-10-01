# =============================================================================
# ELITEBUILD RAG — Embedding Provider Interface & Implementations
# =============================================================================
# Provider-agnostic embedding interface with OpenAI and mock implementations.
# Model and dimensions configurable via environment variables.
# =============================================================================

import os
import time
from abc import ABC, abstractmethod
from typing import List, Optional

from rag.config.settings import settings
from rag.observability.logger import get_rag_logger

logger = get_rag_logger("elitebuild.rag.embeddings")


# ---------------------------------------------------------------------------
# Abstract Embedding Provider
# ---------------------------------------------------------------------------

class EmbeddingProvider(ABC):
    """
    Abstract interface for embedding providers.
    Allows future replacement without changing retrieval architecture.
    """

    @abstractmethod
    def embed(self, text: str) -> List[float]:
        """Embed a single text string into a vector."""
        ...

    @abstractmethod
    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Embed a batch of texts into vectors."""
        ...

    @abstractmethod
    def get_dimension(self) -> int:
        """Return the embedding dimension."""
        ...

    @abstractmethod
    def get_model_name(self) -> str:
        """Return the model identifier."""
        ...


# ---------------------------------------------------------------------------
# OpenAI Embedding Provider
# ---------------------------------------------------------------------------

class OpenAIEmbeddingProvider(EmbeddingProvider):
    """
    Embedding provider using OpenAI's text-embedding API.
    Requires OPENAI_API_KEY environment variable.
    """

    def __init__(
        self,
        model: str = "",
        dimension: int = 0,
        api_key: str = "",
        max_retries: int = 3,
    ):
        self.model = model or settings.embedding_model
        self.dimension = dimension or settings.vector_dimension
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY", "")
        self.max_retries = max_retries
        self._client = None

    def _get_client(self):
        if self._client is None:
            if not self.api_key:
                raise ValueError(
                    "OPENAI_API_KEY environment variable is required for OpenAI embeddings. "
                    "Set it in .env or use EMBEDDING_PROVIDER=mock for development."
                )
            try:
                from openai import OpenAI
                self._client = OpenAI(api_key=self.api_key)
            except ImportError:
                raise ImportError("openai package is required. Install: pip install openai")
        return self._client

    def embed(self, text: str) -> List[float]:
        results = self.embed_batch([text])
        return results[0]

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        client = self._get_client()
        start = time.time()

        for attempt in range(self.max_retries):
            try:
                response = client.embeddings.create(
                    model=self.model,
                    input=texts,
                    dimensions=self.dimension if "3-small" in self.model or "3-large" in self.model else None,
                )
                vectors = [item.embedding for item in response.data]
                elapsed_ms = (time.time() - start) * 1000

                logger.info(
                    f"Embedded {len(texts)} texts ({self.model}) in {elapsed_ms:.1f}ms",
                    extra={"telemetry": {
                        "event_type": "embedding_batch_complete",
                        "model": self.model,
                        "batch_size": len(texts),
                        "dimension": self.dimension,
                        "latency_ms": round(elapsed_ms, 2),
                    }}
                )
                return vectors

            except Exception as e:
                if attempt < self.max_retries - 1:
                    wait = 2 ** attempt
                    logger.warning(
                        f"Embedding attempt {attempt+1} failed: {e}. Retrying in {wait}s..."
                    )
                    time.sleep(wait)
                else:
                    logger.error(f"Embedding failed after {self.max_retries} attempts: {e}")
                    raise

        return []  # unreachable

    def get_dimension(self) -> int:
        return self.dimension

    def get_model_name(self) -> str:
        return self.model


# ---------------------------------------------------------------------------
# Mock Embedding Provider (for development / testing)
# ---------------------------------------------------------------------------

class MockEmbeddingProvider(EmbeddingProvider):
    """
    Deterministic mock embedding provider for development and testing.
    Produces consistent vectors based on text hash — no external API needed.
    """

    def __init__(self, dimension: int = 0):
        self.dimension = dimension or settings.vector_dimension

    def embed(self, text: str) -> List[float]:
        return self._deterministic_vector(text)

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        return [self._deterministic_vector(t) for t in texts]

    def get_dimension(self) -> int:
        return self.dimension

    def get_model_name(self) -> str:
        return "mock-embedding-deterministic"

    def _deterministic_vector(self, text: str) -> List[float]:
        """Generate a deterministic unit vector from text hash."""
        import hashlib
        import struct

        h = hashlib.sha256(text.encode("utf-8")).digest()
        # Generate enough pseudo-random floats
        vector = []
        for i in range(self.dimension):
            # Use different parts of hash, cycling through
            seed = hashlib.sha256(h + i.to_bytes(4, "big")).digest()
            # Convert first 4 bytes to a float in [-1, 1]
            raw_int = struct.unpack("I", seed[:4])[0]
            val = (raw_int / (2**32)) * 2.0 - 1.0
            vector.append(val)

        # Normalize to unit vector
        magnitude = sum(v * v for v in vector) ** 0.5
        if magnitude > 0:
            vector = [v / magnitude for v in vector]

        return vector


# ---------------------------------------------------------------------------
# Provider Factory
# ---------------------------------------------------------------------------

def get_embedding_provider(
    provider: str = "",
    model: str = "",
    dimension: int = 0,
) -> EmbeddingProvider:
    """
    Factory function that returns the configured embedding provider.
    Provider is determined by EMBEDDING_PROVIDER env var or settings.

    Supported providers:
      - "openai": OpenAI text-embedding API (requires OPENAI_API_KEY)
      - "mock": Deterministic mock for development/testing
    """
    provider_name = provider or settings.embedding_provider

    if provider_name == "openai":
        return OpenAIEmbeddingProvider(model=model, dimension=dimension)
    elif provider_name == "mock":
        return MockEmbeddingProvider(dimension=dimension)
    else:
        logger.warning(
            f"Unknown embedding provider '{provider_name}', falling back to mock"
        )
        return MockEmbeddingProvider(dimension=dimension)
