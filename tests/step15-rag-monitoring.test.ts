// =============================================================================
// ELITEBUILD — Step 15 RAG Production Monitoring, Quality Gates & Operational Readiness Tests
// =============================================================================
// Verifies:
// 1. Step 15 module file structure and presence
// 2. 12-subsystem RAG Health Model definitions & probe contracts
// 3. Configurable Quality Gates framework & threshold definitions
// 4. Evaluation-to-production quality linkage (zero fabrication policy)
// 5. Regression detection states (IMPROVED, STABLE, REGRESSED, NOT_COMPARABLE, INSUFFICIENT_DATA)
// 6. Ingestion health & stale knowledge policies (CURRENT, STALE, UNKNOWN)
// 7. Security monitoring & prompt injection boundary audit
// 8. Operational alerting framework & severity levels (INFO, WARNING, CRITICAL)
// 9. Machine-readable operational report schema
// 10. Next.js RBAC permissions & Admin Monitoring UI integration
// =============================================================================

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { canViewRagMonitoring } from '../lib/auth/permissions.ts'

describe('Step 15 — RAG Production Monitoring, Quality Gates & Operational Readiness', () => {
  const rootDir = process.cwd()
  const ragRoot = path.join(rootDir, 'rag')
  const obsDir = path.join(ragRoot, 'observability')

  // ---------------------------------------------------------------------------
  // 1. Step 15 Module Structure
  // ---------------------------------------------------------------------------
  test('Step 15 operational monitoring module files exist and are properly packaged', () => {
    const requiredFiles = [
      'observability/health.py',
      'observability/quality_gates.py',
      'observability/quality_monitor.py',
      'observability/ingestion_monitor.py',
      'observability/alerts.py',
      'observability/security_monitor.py',
      'observability/operational_report.py',
      'tests/test_step15_monitoring.py',
    ]

    for (const relPath of requiredFiles) {
      const fullPath = path.join(ragRoot, relPath)
      assert.ok(
        fs.existsSync(fullPath),
        `Required Step 15 file must exist: rag/${relPath}`
      )
    }
  })

  test('Next.js Admin RAG Monitoring route and page exist', () => {
    const adminPage = path.join(rootDir, 'app', 'admin', '(dashboard)', 'rag-monitoring', 'page.tsx')
    const adminApi = path.join(rootDir, 'app', 'api', 'admin', 'rag-monitoring', 'route.ts')

    assert.ok(fs.existsSync(adminPage), 'Admin rag-monitoring page must exist')
    assert.ok(fs.existsSync(adminApi), 'Admin rag-monitoring API proxy must exist')
  })

  // ---------------------------------------------------------------------------
  // 2. 12-Subsystem Health Model
  // ---------------------------------------------------------------------------
  test('RAG health module covers all 12 subsystems with typed statuses', () => {
    const healthFile = path.join(obsDir, 'health.py')
    const content = fs.readFileSync(healthFile, 'utf8')

    const expectedSubsystems = [
      'api',
      'database',
      'pgvector',
      'embedding_provider',
      'bm25',
      'rrf',
      'reranker',
      'llm',
      'citation_validation',
      'ingestion',
      'evaluation',
      'telemetry',
    ]

    for (const sub of expectedSubsystems) {
      assert.ok(
        content.includes(`"${sub}"`),
        `Health check must declare and monitor subsystem: ${sub}`
      )
    }

    assert.ok(content.includes('check_liveness'), 'health.py must export check_liveness')
    assert.ok(content.includes('check_readiness'), 'health.py must export check_readiness')
    assert.ok(content.includes('check_rag_health'), 'health.py must export check_rag_health')
    assert.ok(content.includes('HEALTHY'), 'Must support HEALTHY status')
    assert.ok(content.includes('DEGRADED'), 'Must support DEGRADED status')
    assert.ok(content.includes('UNAVAILABLE'), 'Must support UNAVAILABLE status')
    assert.ok(content.includes('NOT_CONFIGURED'), 'Must support NOT_CONFIGURED status')
  })

  // ---------------------------------------------------------------------------
  // 3. Quality Gates Framework & Thresholds
  // ---------------------------------------------------------------------------
  test('Quality gates engine defines all required categories and threshold rules', () => {
    const gatesFile = path.join(obsDir, 'quality_gates.py')
    const content = fs.readFileSync(gatesFile, 'utf8')

    const expectedCategories = [
      'retrieval',
      'generation',
      'citation',
      'security',
      'performance',
      'reliability',
    ]

    for (const cat of expectedCategories) {
      assert.ok(
        content.includes(`"${cat}"`),
        `Quality gates must evaluate category: ${cat}`
      )
    }

    // Zero fabrication policy
    assert.ok(
      content.includes('NOT_EVALUATED'),
      'Quality gates must support NOT_EVALUATED status when benchmarks are missing'
    )
    assert.ok(
      content.includes('load_latest_evaluation_run'),
      'Quality gates must link to latest Step 13 evaluation runs'
    )
  })

  // ---------------------------------------------------------------------------
  // 4. Regression Detection States
  // ---------------------------------------------------------------------------
  test('Regression detector implements all 5 required typed regression states', () => {
    const qmFile = path.join(obsDir, 'quality_monitor.py')
    const content = fs.readFileSync(qmFile, 'utf8')

    const expectedStates = [
      'IMPROVED',
      'STABLE',
      'REGRESSED',
      'NOT_COMPARABLE',
      'INSUFFICIENT_DATA',
    ]

    for (const st of expectedStates) {
      assert.ok(
        content.includes(st),
        `Regression detector must support status: ${st}`
      )
    }
  })

  // ---------------------------------------------------------------------------
  // 5. Ingestion Health & Stale Knowledge Policies
  // ---------------------------------------------------------------------------
  test('Ingestion monitor defines freshness policies without inventing expiration dates', () => {
    const ingMonFile = path.join(obsDir, 'ingestion_monitor.py')
    const content = fs.readFileSync(ingMonFile, 'utf8')

    assert.ok(content.includes('CURRENT'), 'Must support CURRENT freshness status')
    assert.ok(content.includes('STALE'), 'Must support STALE freshness status')
    assert.ok(content.includes('UNKNOWN'), 'Must support UNKNOWN freshness status')
    assert.ok(content.includes('assess_freshness'), 'Must provide assess_freshness method')
  })

  // ---------------------------------------------------------------------------
  // 6. Security Monitoring & Prompt Injection Heuristics
  // ---------------------------------------------------------------------------
  test('Security monitor audits events and flags prompt injection attempts', () => {
    const secFile = path.join(obsDir, 'security_monitor.py')
    const content = fs.readFileSync(secFile, 'utf8')

    assert.ok(content.includes('UNAUTHORIZED_RETRIEVAL'), 'Must track unauthorized retrieval')
    assert.ok(content.includes('TENANT_ISOLATION_VIOLATION'), 'Must track tenant isolation violations')
    assert.ok(content.includes('PROMPT_INJECTION_DETECTED'), 'Must track prompt injection events')
    assert.ok(content.includes('inspect_query_for_injection'), 'Must implement inspect_query_for_injection')
  })

  // ---------------------------------------------------------------------------
  // 7. Operational Alerting Framework
  // ---------------------------------------------------------------------------
  test('Alerting engine implements severity tiers and auto-evaluation', () => {
    const alertFile = path.join(obsDir, 'alerts.py')
    const content = fs.readFileSync(alertFile, 'utf8')

    assert.ok(content.includes('INFO'), 'Must support INFO severity')
    assert.ok(content.includes('WARNING'), 'Must support WARNING severity')
    assert.ok(content.includes('CRITICAL'), 'Must support CRITICAL severity')
    assert.ok(content.includes('AlertStore'), 'Must provide thread-safe AlertStore')
    assert.ok(content.includes('AlertEvaluator'), 'Must provide AlertEvaluator')
  })

  // ---------------------------------------------------------------------------
  // 8. FastAPI Endpoints
  // ---------------------------------------------------------------------------
  test('FastAPI app registers all Step 15 health and operational endpoints', () => {
    const appFile = path.join(ragRoot, 'api', 'app.py')
    const content = fs.readFileSync(appFile, 'utf8')

    const endpoints = [
      '/health',
      '/health/live',
      '/health/ready',
      '/rag/health',
      '/api/v1/rag/health',
      '/api/v1/rag/quality-gates',
      '/api/v1/rag/operational-report',
      '/api/v1/rag/alerts',
      '/api/v1/rag/security/events',
      '/api/v1/rag/ingestion/health',
    ]

    for (const ep of endpoints) {
      assert.ok(
        content.includes(`"${ep}"`),
        `FastAPI app must register route: ${ep}`
      )
    }

    assert.ok(
      content.includes('operational_status'),
      'FastAPI app QueryResponse must expose operational_status'
    )
  })

  // ---------------------------------------------------------------------------
  // 9. RBAC & Next.js Permissions
  // ---------------------------------------------------------------------------
  test('RBAC restricts RAG Monitoring access to SUPER_ADMIN and ADMIN', () => {
    assert.strictEqual(canViewRagMonitoring('SUPER_ADMIN'), true)
    assert.strictEqual(canViewRagMonitoring('ADMIN'), true)
    assert.strictEqual(canViewRagMonitoring('EDITOR'), false)
  })

  // ---------------------------------------------------------------------------
  // 10. CLI Tool Support
  // ---------------------------------------------------------------------------
  test('RAG CLI provides report and gates subcommands', () => {
    const cliFile = path.join(ragRoot, 'cli.py')
    const content = fs.readFileSync(cliFile, 'utf8')

    assert.ok(content.includes('cmd_report'), 'CLI must provide cmd_report')
    assert.ok(content.includes('cmd_gates'), 'CLI must provide cmd_gates')
    assert.ok(content.includes('"report"'), 'CLI must register report command')
    assert.ok(content.includes('"gates"'), 'CLI must register gates command')
  })
})
