"""
ELITEBUILD RAG Configuration & Settings
Governs runtime configuration, model parameters, database connections,
and security thresholds via environment variables.
"""

from typing import List, Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class RAGSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # -------------------------------------------------------------------------
    # Application & Multi-Tenancy
    # -------------------------------------------------------------------------
    app_name: str = "ELITEBUILD-RAG"
    environment: str = Field(default="development", env="NODE_ENV")
    default_tenant_id: str = Field(default="elitebuild-core", env="RAG_TENANT_ID")
    service_api_key: Optional[str] = Field(default=None, env="RAG_SERVICE_API_KEY")

    # -------------------------------------------------------------------------
    # Vector Database & Storage
    # -------------------------------------------------------------------------
    database_url: str = Field(
        default="postgresql://elitebuild:elitebuild@localhost:5432/elitebuild",
        env="DATABASE_URL"
    )
    vector_table_name: str = "rag_chunks"
    vector_dimension: int = 1536  # Default dimension for text-embedding-3-small
    hnsw_m: int = 16
    hnsw_ef_construction: int = 64
    hnsw_ef_search: int = 40

    # -------------------------------------------------------------------------
    # Retrieval & Ranking Parameters
    # -------------------------------------------------------------------------
    dense_top_k: int = 50
    sparse_top_k: int = 50
    rrf_k: int = 60
    final_top_k: int = 5
    min_reranker_score: float = 0.35

    # -------------------------------------------------------------------------
    # Model Configurations
    # -------------------------------------------------------------------------
    embedding_provider: str = Field(default="openai", env="EMBEDDING_PROVIDER")
    embedding_model: str = Field(default="text-embedding-3-small", env="EMBEDDING_MODEL")

    reranker_provider: str = Field(default="local", env="RERANKER_PROVIDER")
    reranker_model: str = Field(default="BAAI/bge-reranker-base", env="RERANKER_MODEL")

    llm_provider: str = Field(default="openai", env="LLM_PROVIDER")
    llm_model: str = Field(default="gpt-4o-mini", env="LLM_MODEL")
    llm_temperature: float = 0.0
    llm_timeout_seconds: int = 30
    llm_max_retries: int = 3

    # Groq Cloud API Configuration
    groq_api_key: Optional[str] = Field(default=None, env="GROQ_API_KEY")
    groq_model: str = Field(default="llama-3.3-70b-versatile", env="GROQ_MODEL")

    # -------------------------------------------------------------------------
    # Answer Generation (Step 12)
    # -------------------------------------------------------------------------
    max_evidence_chunks: int = 5
    max_context_chars: int = 12000          # ~3000 tokens
    max_chunk_chars: int = 3000
    max_query_length: int = 1000

    # -------------------------------------------------------------------------
    # Telemetry & Observability
    # -------------------------------------------------------------------------
    enable_detailed_telemetry: bool = True
    log_level: str = "INFO"
    mask_pii_in_logs: bool = True


# Singleton instance
settings = RAGSettings()
