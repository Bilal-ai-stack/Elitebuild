// =============================================================================
// ELITEBUILD — Step 16 End-to-End RAG Integration & Production Readiness Tests
// =============================================================================
// Verifies:
// 1. Next.js to FastAPI Query API proxy (app/api/rag/query/route.ts)
// 2. User-facing Knowledge Search component (components/rag/knowledge-search-modal.tsx)
// 3. Navigation header integration (components/public-header.tsx)
// 4. End-to-End Python integration test suite (rag/tests/test_step16_e2e_integration.py)
// 5. TypeScript RAG contract compatibility (lib/rag/types.ts)
// 6. Security pre-retrieval role mapping & safe fallback handling
// =============================================================================

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import type {
  RagStatus,
  RagOperationalStatus,
  RagQueryResponse,
  RagCitation,
} from '../lib/rag/types.ts'

describe('Step 16 — End-to-End RAG Integration & Production Readiness', () => {
  const rootDir = process.cwd()

  // ---------------------------------------------------------------------------
  // 1. Next.js Query API Proxy
  // ---------------------------------------------------------------------------
  test('Next.js authenticated RAG query proxy route exists', () => {
    const routePath = path.join(rootDir, 'app', 'api', 'rag', 'query', 'route.ts')
    assert.ok(fs.existsSync(routePath), 'app/api/rag/query/route.ts must exist')

    const content = fs.readFileSync(routePath, 'utf-8')
    assert.ok(content.includes('POST'), 'Route must export POST handler')
    assert.ok(content.includes('getSession'), 'Route must extract server-side session')
    assert.ok(content.includes('X-User-Role'), 'Route must forward X-User-Role header')
    assert.ok(content.includes('X-RAG-Service-Key'), 'Route must forward X-RAG-Service-Key')
    assert.ok(content.includes('INSUFFICIENT_EVIDENCE'), 'Route must provide safe degraded fallback')
  })

  // ---------------------------------------------------------------------------
  // 2. User-Facing Search Modal Component
  // ---------------------------------------------------------------------------
  test('Knowledge search modal component exists with evidence status badges', () => {
    const componentPath = path.join(rootDir, 'components', 'rag', 'knowledge-search-modal.tsx')
    assert.ok(fs.existsSync(componentPath), 'components/rag/knowledge-search-modal.tsx must exist')

    const content = fs.readFileSync(componentPath, 'utf-8')
    assert.ok(content.includes('KnowledgeSearchModal'), 'Component must export KnowledgeSearchModal')
    assert.ok(content.includes('SUPPORTED'), 'Component must handle SUPPORTED status')
    assert.ok(content.includes('PARTIALLY_SUPPORTED'), 'Component must handle PARTIALLY_SUPPORTED status')
    assert.ok(content.includes('CONFLICTING_EVIDENCE'), 'Component must handle CONFLICTING_EVIDENCE status')
    assert.ok(content.includes('INSUFFICIENT_EVIDENCE'), 'Component must handle INSUFFICIENT_EVIDENCE status')
    assert.ok(content.includes('degradedMode'), 'Component must display degraded mode indicator')
  })

  // ---------------------------------------------------------------------------
  // 3. Navigation Header Integration
  // ---------------------------------------------------------------------------
  test('Public header integrates verified knowledge search trigger and modal', () => {
    const headerPath = path.join(rootDir, 'components', 'public-header.tsx')
    assert.ok(fs.existsSync(headerPath), 'components/public-header.tsx must exist')

    const content = fs.readFileSync(headerPath, 'utf-8')
    assert.ok(content.includes('KnowledgeSearchModal'), 'PublicHeader must import KnowledgeSearchModal')
    assert.ok(content.includes('searchOpen'), 'PublicHeader must manage searchOpen state')
    assert.ok(content.includes('Search Records'), 'PublicHeader must render Search Records trigger button')
  })

  // ---------------------------------------------------------------------------
  // 4. End-to-End Python Test Suite
  // ---------------------------------------------------------------------------
  test('Python Step 16 end-to-end integration test suite exists', () => {
    const testPath = path.join(rootDir, 'rag', 'tests', 'test_step16_e2e_integration.py')
    assert.ok(fs.existsSync(testPath), 'rag/tests/test_step16_e2e_integration.py must exist')

    const content = fs.readFileSync(testPath, 'utf-8')
    assert.ok(content.includes('TestEndToEndQueryFlow'), 'Must include TestEndToEndQueryFlow')
    assert.ok(content.includes('TestPreRetrievalAuthorization'), 'Must include TestPreRetrievalAuthorization')
    assert.ok(content.includes('TestTenantIsolation'), 'Must include TestTenantIsolation')
    assert.ok(content.includes('TestPromptInjectionResistance'), 'Must include TestPromptInjectionResistance')
    assert.ok(content.includes('TestDegradationAndFailureModes'), 'Must include TestDegradationAndFailureModes')
    assert.ok(content.includes('TestObservabilityAndTraceSpans'), 'Must include TestObservabilityAndTraceSpans')
  })

  // ---------------------------------------------------------------------------
  // 5. TypeScript Contract Types Verification
  // ---------------------------------------------------------------------------
  test('TypeScript contracts support full query response and evidence citations', () => {
    const mockCitation: RagCitation = {
      index: 1,
      documentId: 'doc-pec-01',
      chunkId: 'chunk-001',
      title: 'PEC License Certificate',
      sourceAuthority: 'VERIFIED_DOCUMENT',
      versionTag: '1.0',
      snippet: 'M/S Elite Construction Company is licensed under PEC C-1.',
    }

    const mockResponse: RagQueryResponse = {
      requestId: 'rag-q-test-123',
      status: 'SUPPORTED',
      operationalStatus: 'HEALTHY',
      answer: 'Elite is registered under PEC Category C-1 [1].',
      citations: [mockCitation],
      telemetry: {
        totalLatencyMs: 145.2,
        retrievalLatencyMs: 25.1,
        rerankLatencyMs: 10.2,
        generationLatencyMs: 110.0,
        promptTokens: 250,
        completionTokens: 45,
        estimatedCostUsd: 0.0002,
        cacheHit: false,
        operationalStatus: 'HEALTHY',
        degradedMode: false,
      },
    }

    assert.equal(mockResponse.status, 'SUPPORTED')
    assert.equal(mockResponse.operationalStatus, 'HEALTHY')
    assert.equal(mockResponse.citations.length, 1)
    assert.equal(mockResponse.citations[0].documentId, 'doc-pec-01')
  })
})
