# =============================================================================
# ELITEBUILD RAG — Database Session & Engine
# =============================================================================

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session

from rag.config.settings import settings
from rag.db.models import Base


def get_engine(database_url: str | None = None):
    """Create SQLAlchemy engine with pgvector extension support."""
    url = database_url or settings.database_url
    engine = create_engine(
        url,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        echo=False,
    )
    return engine


def init_database(engine=None):
    """
    Initialize RAG tables and pgvector extension.
    Safe to call repeatedly — only creates tables that don't exist.
    Does NOT touch existing Prisma-managed tables.
    """
    if engine is None:
        engine = get_engine()

    with engine.connect() as conn:
        # Enable pgvector extension (idempotent)
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()

    # Create only RAG tables (rag_documents, rag_chunks)
    # This does NOT affect existing Prisma tables
    Base.metadata.create_all(engine, checkfirst=True)

    return engine


def get_session_factory(engine=None) -> sessionmaker:
    if engine is None:
        engine = get_engine()
    return sessionmaker(bind=engine, expire_on_commit=False)


def get_session(engine=None) -> Session:
    """Get a new database session."""
    factory = get_session_factory(engine)
    return factory()
