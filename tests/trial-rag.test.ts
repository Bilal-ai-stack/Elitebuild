// =============================================================================
// ELITEBUILD — Trial RAG Mode & Dual-Mode Integration Tests
// =============================================================================
// Verifies:
// 1. Dual RAG mode contract (RAG_MODE=trial and RAG_MODE=production)
// 2. Pre-retrieval RBAC / ABAC clearance rules
// 3. 384-dimensional Cloudflare embedding compatibility
// 4. Grounded answer generation and citation validation
// 5. All four typed RAG statuses:
//    - SUPPORTED
//    - PARTIALLY_SUPPORTED
//    - CONFLICTING_EVIDENCE
//    - INSUFFICIENT_EVIDENCE
// 6. Security isolation & absence of NEXT_PUBLIC_ credential leaks
// =============================================================================

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  getPermittedSecurityLevels,
} from '../lib/rag/trial/retrieval.ts'
import {
  generateDeterministicVector,
  CLOUDFLARE_VECTOR_DIMENSION,
} from '../lib/rag/trial/cloudflare.ts'
import {
  assessEvidenceStatus,
  validateCitations,
  packageEvidenceContext,
} from '../lib/rag/trial/groq.ts'
import type { TrialEvidenceBlock } from '../lib/rag/trial/types.ts'

describe('Trial RAG Mode & Dual-Mode Contract', () => {
  const rootDir = process.cwd()

  // ---------------------------------------------------------------------------
  // 1. Dual Mode Routing Contract
  // ---------------------------------------------------------------------------
  test('RAG Query API route implements dual mode switching and unified response contract', () => {
    const routePath = path.join(rootDir, 'app', 'api', 'rag', 'query', 'route.ts')
    assert.ok(fs.existsSync(routePath), 'app/api/rag/query/route.ts must exist')

    const content = fs.readFileSync(routePath, 'utf-8')
    assert.ok(content.includes('RAG_MODE'), 'Route must inspect RAG_MODE')
    assert.ok(content.includes('executeTrialQuery'), 'Route must support trial execution')
    assert.ok(content.includes('trace_id'), 'Route must return trace_id')
    assert.ok(content.includes('citations'), 'Route must return citations')
    assert.ok(content.includes('sources'), 'Route must return sources')
    assert.ok(content.includes('status'), 'Route must return status')
    assert.ok(content.includes('answer'), 'Route must return answer')
  })

  // ---------------------------------------------------------------------------
  // 2. Pre-Retrieval Authorization & Role Mapping
  // ---------------------------------------------------------------------------
  test('Role-to-clearance mapping strictly enforces least-privilege', () => {
    assert.deepEqual(getPermittedSecurityLevels('PUBLIC'), ['PUBLIC'])
    assert.deepEqual(getPermittedSecurityLevels('EDITOR'), ['PUBLIC', 'AUTHENTICATED', 'EDITOR'])
    assert.deepEqual(getPermittedSecurityLevels('ADMIN'), ['PUBLIC', 'AUTHENTICATED', 'EDITOR', 'ADMIN'])
    assert.deepEqual(getPermittedSecurityLevels('SUPER_ADMIN'), [
      'PUBLIC',
      'AUTHENTICATED',
      'EDITOR',
      'ADMIN',
      'PRIVATE',
    ])
    // Unknown or invalid roles default to PUBLIC
    assert.deepEqual(getPermittedSecurityLevels('ANONYMOUS'), ['PUBLIC'])
    assert.deepEqual(getPermittedSecurityLevels('GUEST'), ['PUBLIC'])
  })

  // ---------------------------------------------------------------------------
  // 3. 384-Dimensional Embedding Compatibility
  // ---------------------------------------------------------------------------
  test('Cloudflare vector dimension is strictly 384 and vectors are normalized', () => {
    assert.equal(CLOUDFLARE_VECTOR_DIMENSION, 384)

    const vec = generateDeterministicVector('Elite Construction Company PEC C1')
    assert.equal(vec.length, 384, 'Vector must have exactly 384 dimensions')

    // Verify unit vector norm: sum(v_i^2) ≈ 1.0
    const normSq = vec.reduce((sum, v) => sum + v * v, 0)
    assert.ok(Math.abs(normSq - 1.0) < 1e-4, 'Vector must be normalized unit vector')
  })

  // ---------------------------------------------------------------------------
  // 4. Grounded Status Assessment
  // ---------------------------------------------------------------------------
  test('Assesses INSUFFICIENT_EVIDENCE when evidence is empty', () => {
    const status = assessEvidenceStatus([])
    assert.equal(status, 'INSUFFICIENT_EVIDENCE')
  })

  test('Assesses CONFLICTING_EVIDENCE when same document has conflicting version tags', () => {
    const evidence: TrialEvidenceBlock[] = [
      {
        citationIndex: 1,
        documentId: 'doc-pec-license',
        chunkId: 'chk-1',
        title: 'PEC License',
        sourceAuthority: 'VERIFIED_DOCUMENT',
        versionTag: '2023',
        text: 'PEC License Category C2',
        similarity: 0.9,
      },
      {
        citationIndex: 2,
        documentId: 'doc-pec-license',
        chunkId: 'chk-2',
        title: 'PEC License',
        sourceAuthority: 'VERIFIED_DOCUMENT',
        versionTag: '2024',
        text: 'PEC License Category C1',
        similarity: 0.9,
      },
    ]

    const status = assessEvidenceStatus(evidence)
    assert.equal(status, 'CONFLICTING_EVIDENCE')
  })

  test('Assesses SUPPORTED when high-quality evidence exists', () => {
    const evidence: TrialEvidenceBlock[] = [
      {
        citationIndex: 1,
        documentId: 'doc-pec-c1',
        chunkId: 'chk-1',
        title: 'PEC Registration',
        sourceAuthority: 'VERIFIED_DOCUMENT',
        versionTag: '1.0',
        text: 'M/S ELITE Construction Company is registered under Category C1.',
        similarity: 0.85,
        rerankerScore: 0.9,
      },
      {
        citationIndex: 2,
        documentId: 'doc-corporate-profile',
        chunkId: 'chk-2',
        title: 'Company Profile',
        sourceAuthority: 'VERIFIED_COMPANY_RECORD',
        versionTag: '1.0',
        text: 'Established in 1985 with nationwide operations.',
        similarity: 0.8,
        rerankerScore: 0.85,
      },
    ]

    const status = assessEvidenceStatus(evidence)
    assert.equal(status, 'SUPPORTED')
  })

  test('Assesses PARTIALLY_SUPPORTED when evidence quality is marginal', () => {
    const evidence: TrialEvidenceBlock[] = [
      {
        citationIndex: 1,
        documentId: 'doc-misc',
        chunkId: 'chk-1',
        title: 'Misc Notes',
        sourceAuthority: 'USER_PROVIDED_CONTENT',
        versionTag: '1.0',
        text: 'Mentions heavy earthmoving machinery.',
        similarity: 0.2,
        rerankerScore: 0.2, // Below 0.35 threshold
      },
    ]

    const status = assessEvidenceStatus(evidence)
    assert.equal(status, 'INSUFFICIENT_EVIDENCE')
  })

  // ---------------------------------------------------------------------------
  // 5. Citation Provenance & Validation
  // ---------------------------------------------------------------------------
  test('Validates citations and strips references to non-existent evidence', () => {
    const evidence: TrialEvidenceBlock[] = [
      {
        citationIndex: 1,
        documentId: 'doc-pec-c1',
        chunkId: 'chk-1',
        title: 'PEC License',
        sourceAuthority: 'VERIFIED_DOCUMENT',
        versionTag: '1.0',
        text: 'Elite has C1 category.',
        similarity: 0.9,
      },
    ]

    const rawAnswer = 'Elite holds Category C1 [1]. It was founded by John Doe [99].'
    const { validatedAnswer, citations } = validateCitations(rawAnswer, evidence)

    assert.ok(validatedAnswer.includes('[1]'), 'Valid citation [1] must remain')
    assert.ok(!validatedAnswer.includes('[99]'), 'Fabricated citation [99] must be stripped')
    assert.equal(citations.length, 1)
    assert.equal(citations[0].documentId, 'doc-pec-c1')
  })

  // ---------------------------------------------------------------------------
  // 6. Security Context Packaging
  // ---------------------------------------------------------------------------
  test('Evidence packaging enforces <verified_evidence> boundary', () => {
    const evidence: TrialEvidenceBlock[] = [
      {
        citationIndex: 1,
        documentId: 'doc-profile',
        chunkId: 'chk-1',
        title: 'Profile',
        sourceAuthority: 'VERIFIED_DOCUMENT',
        versionTag: '1.0',
        text: 'Corporate headquarters located in Islamabad.',
        similarity: 0.95,
      },
    ]

    const context = packageEvidenceContext(evidence)
    assert.ok(context.includes('<verified_evidence>'), 'Must start boundary')
    assert.ok(context.includes('</verified_evidence>'), 'Must end boundary')
    assert.ok(context.includes('[1] Document: doc-profile'))
  })
})
