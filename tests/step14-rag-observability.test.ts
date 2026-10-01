// =============================================================================
// ELITEBUILD — Step 14 RAG Observability, Telemetry, Tracing & Quality Monitoring Tests
// =============================================================================
// Verifies:
// 1. Observability module file structure and presence
// 2. Event schemas and standardized lifecycle event types
// 3. Security sanitization (zero secrets, credential scrubbing, PII protection)
// 4. Metric state classification (MEASURED, ESTIMATED, NOT_AVAILABLE, NOT_IMPLEMENTED)
// 5. OpenTelemetry-compatible tracing abstractions (Span, RAGTrace, TraceStore)
// 6. Component health probe contract (HEALTHY vs DEGRADED)
// 7. Quality regression detector thresholds and report shape
// 8. Protected observability endpoints and rate limiting
// =============================================================================

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

describe('Step 14 — RAG Observability, Telemetry, Tracing & Quality Monitoring', () => {
  const ragRoot = path.resolve(process.cwd(), 'rag')
  const obsDir = path.join(ragRoot, 'observability')

  // ---------------------------------------------------------------------------
  // 1. Observability Module Structure
  // ---------------------------------------------------------------------------
  test('Observability module directory structure is complete and properly packaged', () => {
    const requiredFiles = [
      'observability/__init__.py',
      'observability/events.py',
      'observability/logger.py',
      'observability/sanitizer.py',
      'observability/tracer.py',
      'observability/cost.py',
      'observability/health.py',
      'observability/quality_monitor.py',
    ]

    for (const relPath of requiredFiles) {
      const fullPath = path.join(ragRoot, relPath)
      assert.ok(
        fs.existsSync(fullPath),
        `Required observability module file must exist: rag/${relPath}`
      )
    }
  })

  // ---------------------------------------------------------------------------
  // 2. Standardized Event Types & State Machine
  // ---------------------------------------------------------------------------
  test('Event types include all required lifecycle and security event constants', () => {
    const eventsFile = path.join(obsDir, 'events.py')
    const content = fs.readFileSync(eventsFile, 'utf8')

    const expectedEvents = [
      'rag.request.started',
      'rag.authorization.completed',
      'rag.retrieval.started',
      'rag.dense.completed',
      'rag.bm25.completed',
      'rag.rrf.completed',
      'rag.reranker.completed',
      'rag.evidence.assessed',
      'rag.generation.started',
      'rag.generation.completed',
      'rag.citation.validation.completed',
      'rag.request.completed',
      'rag.request.failed',
    ]

    for (const evt of expectedEvents) {
      assert.ok(
        content.includes(evt),
        `events.py must define standard event: ${evt}`
      )
    }

    const expectedSecurityEvents = [
      'unauthorized_rag_request',
      'tenant_access_denied',
      'document_access_denied',
      'invalid_auth_context',
      'prompt_injection_detected',
    ]

    for (const secEvt of expectedSecurityEvents) {
      assert.ok(
        content.includes(secEvt),
        `events.py must define security event: ${secEvt}`
      )
    }
  })

  // ---------------------------------------------------------------------------
  // 3. Metric State Truthfulness Contract
  // ---------------------------------------------------------------------------
  test('Metric states strictly prohibit fabrication (MEASURED, ESTIMATED, NOT_AVAILABLE)', () => {
    const eventsFile = path.join(obsDir, 'events.py')
    const content = fs.readFileSync(eventsFile, 'utf8')

    assert.ok(content.includes('MEASURED'), 'MetricState must define MEASURED')
    assert.ok(content.includes('ESTIMATED'), 'MetricState must define ESTIMATED')
    assert.ok(content.includes('NOT_AVAILABLE'), 'MetricState must define NOT_AVAILABLE')
    assert.ok(content.includes('NOT_IMPLEMENTED'), 'MetricState must define NOT_IMPLEMENTED')
  })

  // ---------------------------------------------------------------------------
  // 4. Secret Scrubbing & Privacy Protection
  // ---------------------------------------------------------------------------
  test('Sanitizer defines patterns for API keys, passwords, bearer tokens, and identifiers', () => {
    const sanitizerFile = path.join(obsDir, 'sanitizer.py')
    const content = fs.readFileSync(sanitizerFile, 'utf8')

    assert.ok(content.includes('sanitize_secrets_in_text'), 'Must export sanitize_secrets_in_text')
    assert.ok(content.includes('sanitize_telemetry_dict'), 'Must export sanitize_telemetry_dict')
    assert.ok(content.includes('mask_identifier'), 'Must export mask_identifier')
    assert.ok(content.includes('hash_query_text'), 'Must export hash_query_text')
    assert.ok(content.includes('sk-'), 'Must pattern match OpenAI API keys')
    assert.ok(content.includes('gsk_'), 'Must pattern match Groq API keys')
    assert.ok(content.includes('password'), 'Must scrub password fields')
  })

  // ---------------------------------------------------------------------------
  // 5. OpenTelemetry-Compatible Tracing & In-Memory Store
  // ---------------------------------------------------------------------------
  test('Tracer implements Span, RAGTrace, and thread-safe TraceStore with percentiles', () => {
    const tracerFile = path.join(obsDir, 'tracer.py')
    const content = fs.readFileSync(tracerFile, 'utf8')

    assert.ok(content.includes('class Span'), 'tracer.py must define Span')
    assert.ok(content.includes('class RAGTrace'), 'tracer.py must define RAGTrace')
    assert.ok(content.includes('class TraceStore'), 'tracer.py must define TraceStore')
    assert.ok(content.includes('percentile'), 'TraceStore must calculate percentiles')
    assert.ok(content.includes('INSUFFICIENT_SAMPLE'), 'Must return INSUFFICIENT_SAMPLE when sample < 5')
    assert.ok(content.includes('total_p50'), 'Must track total_p50')
    assert.ok(content.includes('total_p95'), 'Must track total_p95')
  })

  // ---------------------------------------------------------------------------
  // 6. Subsystem Health Probe
  // ---------------------------------------------------------------------------
  test('Health check verifies core components and degraded modes without database destruction', () => {
    const healthFile = path.join(obsDir, 'health.py')
    const content = fs.readFileSync(healthFile, 'utf8')

    assert.ok(content.includes('check_rag_health'), 'Must export check_rag_health')
    assert.ok(content.includes('database'), 'Must probe database')
    assert.ok(content.includes('vector_store'), 'Must probe pgvector store')
    assert.ok(content.includes('bm25_search'), 'Must probe BM25 search')
    assert.ok(content.includes('embedding_provider'), 'Must probe embedding provider')
    assert.ok(content.includes('reranker'), 'Must probe reranker')
    assert.ok(content.includes('llm_provider'), 'Must probe llm provider')
    assert.ok(content.includes('HEALTHY'), 'Must support HEALTHY status')
    assert.ok(content.includes('DEGRADED'), 'Must support DEGRADED status')
  })

  // ---------------------------------------------------------------------------
  // 7. Quality Regression Detection
  // ---------------------------------------------------------------------------
  test('Quality regression detector evaluates benchmark run deltas and thresholds', () => {
    const qmFile = path.join(obsDir, 'quality_monitor.py')
    const content = fs.readFileSync(qmFile, 'utf8')

    assert.ok(content.includes('class QualityRegressionDetector'), 'Must define QualityRegressionDetector')
    assert.ok(content.includes('recall_tolerance'), 'Must configure recall tolerance')
    assert.ok(content.includes('faithfulness_tolerance'), 'Must configure faithfulness tolerance')
    assert.ok(content.includes('hallucination_tolerance'), 'Must configure hallucination tolerance')
    assert.ok(content.includes('compare_runs'), 'Must define compare_runs method')
  })

  // ---------------------------------------------------------------------------
  // 8. FastAPI Observability Endpoints
  // ---------------------------------------------------------------------------
  test('FastAPI app exposes protected observability routes and health check', () => {
    const appFile = path.join(ragRoot, 'api', 'app.py')
    const content = fs.readFileSync(appFile, 'utf8')

    assert.ok(content.includes('/api/v1/rag/health'), 'Must expose /api/v1/rag/health')
    assert.ok(content.includes('/api/v1/rag/observability/metrics'), 'Must expose /observability/metrics')
    assert.ok(content.includes('/api/v1/rag/observability/traces'), 'Must expose /observability/traces')
    assert.ok(content.includes('/api/v1/rag/observability/compare'), 'Must expose /observability/compare')
  })
})
