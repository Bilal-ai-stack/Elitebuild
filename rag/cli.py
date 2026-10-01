# =============================================================================
# ELITEBUILD RAG — Developer CLI Commands
# =============================================================================
# Usage:
#   python -m rag.cli init        Initialize RAG database tables & pgvector
#   python -m rag.cli ingest      Ingest approved database sources
#   python -m rag.cli status      Inspect ingestion status
#   python -m rag.cli retrieve    Run a test retrieval query
#   python -m rag.cli serve       Start the FastAPI RAG service
# =============================================================================

import argparse
import json
import sys


def cmd_init(args):
    """Initialize RAG storage (pgvector extension + tables)."""
    print("🏗️  Initializing ELITEBUILD RAG database...")
    from rag.db.session import get_engine, init_database

    engine = get_engine()
    init_database(engine)
    print("✅ RAG database initialized (rag_documents + rag_chunks tables created)")
    print("   pgvector extension enabled")
    print("   Existing Prisma-managed tables are NOT affected")


def cmd_ingest(args):
    """Ingest approved database sources into the RAG knowledge base."""
    print("📥 Starting RAG ingestion from database sources...")
    from rag.db.session import get_engine, get_session, init_database
    from rag.ingestion.pipeline import IngestionPipeline

    engine = get_engine()
    init_database(engine)
    session = get_session(engine)

    pipeline = IngestionPipeline(session=session)
    report = pipeline.ingest_from_database()

    print(f"\n✅ Ingestion Complete:")
    print(f"   Sources processed: {report.total_sources}")
    print(f"   Ingested:          {report.ingested}")
    print(f"   Skipped (unchanged): {report.skipped_unchanged}")
    print(f"   Failed:            {report.failed}")
    print(f"   Total chunks:      {report.total_chunks}")
    print(f"   Total embeddings:  {report.total_embeddings}")
    print(f"   Elapsed:           {report.elapsed_ms:.0f}ms")

    if report.errors:
        print(f"\n⚠️  Errors ({len(report.errors)}):")
        for err in report.errors:
            print(f"   - {err['document_id']}: {err['error']}")

    session.close()


def cmd_status(args):
    """Inspect current ingestion status."""
    from rag.db.session import get_engine, get_session
    from rag.ingestion.pipeline import IngestionPipeline

    engine = get_engine()
    session = get_session(engine)

    pipeline = IngestionPipeline(session=session)
    status = pipeline.get_ingestion_status()

    print(f"\n📊 RAG Ingestion Status — Tenant: {status['tenant_id']}")
    print(f"   Total documents: {status['total_documents']}")
    print(f"   Total chunks:    {status['total_chunks']}")
    print(f"   Embedded chunks: {status['embedded_chunks']}")

    if status['status_breakdown']:
        print(f"\n   Status breakdown:")
        for s, count in status['status_breakdown'].items():
            print(f"     {s}: {count}")

    if status['documents']:
        print(f"\n   Documents:")
        for d in status['documents']:
            print(f"     [{d['ingestion_status']}] {d['document_id']} "
                  f"v{d['version_tag']} ({d['chunk_count']} chunks)")

    session.close()


def cmd_retrieve(args):
    """Run a test retrieval query."""
    query = args.query
    role = args.role or "PUBLIC"
    top_k = args.top_k or 5

    print(f"\n🔍 Retrieval Query: \"{query}\"")
    print(f"   Role: {role} | Top-K: {top_k}\n")

    from rag.db.session import get_engine, get_session
    from rag.retrieval.engine import HybridRetrievalEngine

    engine = get_engine()
    session = get_session(engine)

    hybrid = HybridRetrievalEngine(session=session)
    results, telemetry = hybrid.retrieve(
        query=query,
        user_role=role,
        final_top_k=top_k,
    )

    print(f"📊 Telemetry:")
    print(f"   Dense candidates:  {telemetry.dense_candidate_count}")
    print(f"   BM25 candidates:   {telemetry.bm25_candidate_count}")
    print(f"   RRF candidates:    {telemetry.rrf_candidate_count}")
    print(f"   Final results:     {telemetry.final_result_count}")
    print(f"   Total latency:     {telemetry.retrieval_latency_ms:.1f}ms")

    if not results:
        print("\n⚠️  No results found. Status: INSUFFICIENT_EVIDENCE")
    else:
        print(f"\n📋 Results ({len(results)}):")
        for i, r in enumerate(results):
            print(f"\n   [{i+1}] chunk_id: {r.chunk_id}")
            print(f"       document:  {r.document_id} v{r.document_version}")
            print(f"       authority: {r.source_authority}")
            print(f"       security:  {r.security_access_level}")
            print(f"       score:     {r.score:.6f}")
            if r.reranker_score is not None:
                print(f"       reranker:  {r.reranker_score:.6f}")
            print(f"       heading:   {r.heading_path}")
            # Show first 200 chars of text
            preview = r.chunk_text[:200].replace("\n", " ")
            print(f"       text:      {preview}...")

    session.close()


def cmd_serve(args):
    """Start the FastAPI RAG service."""
    import uvicorn
    host = args.host or "127.0.0.1"
    port = args.port or 8000
    print(f"🚀 Starting ELITEBUILD RAG Service on {host}:{port}")
    uvicorn.run("rag.api.app:app", host=host, port=port, reload=True)


def cmd_eval(args):
    """Run RAG benchmark evaluation suite."""
    from rag.evaluation.runner import BenchmarkRunner
    runner = BenchmarkRunner(benchmark_path=args.benchmark, output_dir=args.output)
    print(f"🚀 Running ELITEBUILD RAG Evaluation Benchmark [Mode: {args.mode.upper()}]...")
    results = runner.run_benchmark(mode=args.mode, case_id=args.case_id)
    report = runner.reporter.generate_markdown_report(results)
    print("\n" + report)
    print(f"\n💾 Machine-readable results saved to: {results['artifact_file']}\n")


def main():
    parser = argparse.ArgumentParser(
        prog="rag",
        description="ELITEBUILD RAG Service CLI",
    )
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # init
    subparsers.add_parser("init", help="Initialize RAG database tables & pgvector")

    # ingest
    subparsers.add_parser("ingest", help="Ingest approved database sources")

    # status
    subparsers.add_parser("status", help="Inspect ingestion status")

    # retrieve
    retrieve_parser = subparsers.add_parser("retrieve", help="Run test retrieval query")
    retrieve_parser.add_argument("query", help="Search query text")
    retrieve_parser.add_argument("--role", default="PUBLIC", help="User role (PUBLIC/EDITOR/ADMIN/SUPER_ADMIN)")
    retrieve_parser.add_argument("--top-k", type=int, default=5, help="Number of results")

    # serve
    serve_parser = subparsers.add_parser("serve", help="Start FastAPI RAG service")
    serve_parser.add_argument("--host", default="127.0.0.1")
    serve_parser.add_argument("--port", type=int, default=8000)

    # eval
    eval_parser = subparsers.add_parser("eval", help="Run RAG benchmark evaluation suite")
    eval_parser.add_argument("--mode", choices=["full", "retrieval", "generation", "security"], default="full", help="Evaluation mode")
    eval_parser.add_argument("--case-id", type=str, default=None, help="Specific test case ID")
    eval_parser.add_argument("--benchmark", type=str, default=None, help="Custom benchmark path")
    eval_parser.add_argument("--output", type=str, default=None, help="Custom results output path")

    args = parser.parse_args()

    if args.command == "init":
        cmd_init(args)
    elif args.command == "ingest":
        cmd_ingest(args)
    elif args.command == "status":
        cmd_status(args)
    elif args.command == "retrieve":
        cmd_retrieve(args)
    elif args.command == "serve":
        cmd_serve(args)
    elif args.command == "eval":
        cmd_eval(args)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
