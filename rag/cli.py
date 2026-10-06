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

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


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


def cmd_metrics(args):
    """Inspect aggregated RAG telemetry metrics."""
    from rag.observability import trace_store
    metrics = trace_store.get_aggregated_metrics()
    print("\n📊 ELITEBUILD RAG Observability — Aggregated Metrics")
    print(json.dumps(metrics, indent=2))


def cmd_trace(args):
    """Inspect an individual RAG trace by ID."""
    from rag.observability import trace_store
    trace = trace_store.get_trace(args.trace_id)
    if not trace:
        print(f"\n[WARN] Trace ID '{args.trace_id}' not found in telemetry store.")
        sys.exit(1)
    print(f"\n[TRACE] Trace Details [{args.trace_id}]")
    print(json.dumps(trace.to_dict(), indent=2))


def cmd_health(args):
    """Inspect RAG subsystem health status."""
    from rag.observability import check_rag_health
    report = check_rag_health()
    status_icon = "[OK]" if report["status"] == "HEALTHY" else ("[WARN]" if report["status"] == "DEGRADED" else "[FAIL]")
    print(f"\n{status_icon} RAG Health Status: {report['status']}")
    print(json.dumps(report, indent=2))


def cmd_compare(args):
    """Compare two evaluation runs to detect quality regressions."""
    from rag.observability.quality_monitor import QualityRegressionDetector
    detector = QualityRegressionDetector()
    try:
        report = detector.compare_from_files(args.baseline, args.candidate)
        print("\n--- Quality Regression Report ---")
        status_icon = "[FAIL]" if report["regression_detected"] else "[OK]"
        print(f"{status_icon} Regression Detected: {report['regression_detected']}")
        print(f"Summary: {report['summary']}")
        if report["regressions"]:
            print("\n[!] Regressions:")
            for r in report["regressions"]:
                print(f"   - [{r['severity']}] {r['metric']}: {r['baseline']} -> {r['candidate']} ({r['relative_change']})")
        if report["improvements"]:
            print("\n[+] Improvements:")
            for imp in report["improvements"]:
                print(f"   + {imp['metric']}: {imp['baseline']} -> {imp['candidate']} ({imp['relative_change']})")
    except Exception as e:
        print(f"Error comparing runs: {e}")
        sys.exit(1)


def cmd_report(args):
    """Generate and print machine-readable operational report."""
    from rag.observability.operational_report import generate_operational_report
    report = generate_operational_report()
    if getattr(args, "json", False):
        print(json.dumps(report, indent=2))
    else:
        print("\n=======================================================")
        print("ELITEBUILD RAG — Operational Readiness & Health Report")
        print("=======================================================")
        print(f"Service Status:       {report['service_status']}")
        print(f"Environment:          {report['environment']}")
        print(f"Quality Gate Status:  {report['quality_gate_status']}")
        print(f"Regression Status:    {report['regression_status']}")
        print(f"Active Alerts:        {report['alert_summary']['total_alerts']} ({report['alert_summary']['critical']} critical)")
        print("\nComponents:")
        for comp, status in report['component_status'].items():
            print(f"  - {comp:22}: {status}")
        print("\nQuality Gate Categories:")
        for cat, status in report['quality_gate_summary'].items():
            print(f"  - {cat:22}: {status}")
        print("=======================================================\n")


def cmd_gates(args):
    """Evaluate production quality gates against latest evaluation run."""
    from rag.observability.quality_gates import QualityGateEngine
    engine = QualityGateEngine()
    res = engine.evaluate_run()
    print("\n--- Production Quality Gates ---")
    print(f"Overall Status: {res['overall_status']}")
    print(f"Benchmark:      {res['evaluation_metadata']['benchmark_version'] if res.get('evaluation_metadata') else 'NONE'}")
    print("\nRules:")
    for r in res.get("rule_evaluations", []):
        icon = "[PASS]" if r["status"] == "PASSED" else ("[FAIL]" if r["status"] == "FAILED" else "[--]")
        print(f"  {icon} {r['rule']:24} ({r['category']}): {r['actual']} (threshold: {r['operator']} {r['threshold']})")
    print("--------------------------------\n")


def cmd_groq(args):
    """Inspect and test Groq Cloud API LLM provider readiness."""
    from rag.observability import check_groq_health
    probe = getattr(args, "probe", False)
    res = check_groq_health(probe_api=probe)
    status = res.get("status", "UNKNOWN")
    print(f"\n[GROQ] Groq Cloud LLM Status: {status}")
    print(f"       Configured Model:      {res.get('model', 'llama-3.3-70b-versatile')}")
    print(f"       API Key Present:       {res.get('configured', False)}")
    if res.get("message"):
        print(f"       Status Message:        {res.get('message')}")
    if res.get("error"):
        print(f"       Error:                 {res.get('error')}")
    print()


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

    # metrics
    subparsers.add_parser("metrics", help="Display aggregated RAG telemetry and metrics")

    # trace
    trace_parser = subparsers.add_parser("trace", help="Inspect a specific trace by ID")
    trace_parser.add_argument("trace_id", help="Trace identifier")

    # health
    subparsers.add_parser("health", help="Check component health status")

    # compare
    compare_parser = subparsers.add_parser("compare", help="Compare two evaluation runs")
    compare_parser.add_argument("--baseline", required=True, help="Baseline JSON run file")
    compare_parser.add_argument("--candidate", required=True, help="Candidate JSON run file")

    # report
    report_parser = subparsers.add_parser("report", help="Generate machine-readable operational report")
    report_parser.add_argument("--json", action="store_true", help="Output raw JSON")

    # gates
    subparsers.add_parser("gates", help="Evaluate production quality gates")

    # groq
    groq_parser = subparsers.add_parser("groq", help="Inspect and test Groq Cloud LLM provider readiness")
    groq_parser.add_argument("--probe", action="store_true", help="Perform minimal live connectivity check against Groq API")

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
    elif args.command == "metrics":
        cmd_metrics(args)
    elif args.command == "trace":
        cmd_trace(args)
    elif args.command == "health":
        cmd_health(args)
    elif args.command == "compare":
        cmd_compare(args)
    elif args.command == "report":
        cmd_report(args)
    elif args.command == "gates":
        cmd_gates(args)
    elif args.command == "groq":
        cmd_groq(args)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()

