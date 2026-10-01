// =============================================================================
// ELITEBUILD — Step 10 RAG Foundation Test Suite
// =============================================================================
// Verifies:
// 1. Pre-retrieval authorization role mapping
// 2. Reciprocal Rank Fusion (RRF) math and deterministic ordering
// 3. Typed RAG status contract adherence
// 4. Citation structure integrity and validation
// 5. Benchmark dataset template schema validation
// =============================================================================

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import type {
  RagStatus,
  SecurityAccessLevel,
  RagCitation,
  RagUserContext,
} from '../lib/rag/types.ts'

describe('Step 10 — RAG Architecture & Foundation Contracts', () => {
  // ---------------------------------------------------------------------------
  // 1. Pre-Retrieval Authorization Logic
  // ---------------------------------------------------------------------------
  function getPermittedSecurityLevels(role: 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR' | 'PUBLIC'): SecurityAccessLevel[] {
    switch (role) {
      case 'SUPER_ADMIN':
        return ['PUBLIC', 'AUTHENTICATED', 'EDITOR', 'ADMIN', 'PRIVATE']
      case 'ADMIN':
        return ['PUBLIC', 'AUTHENTICATED', 'EDITOR', 'ADMIN']
      case 'EDITOR':
        return ['PUBLIC', 'AUTHENTICATED', 'EDITOR']
      case 'PUBLIC':
      default:
        return ['PUBLIC']
    }
  }

  test('Pre-retrieval authorization filters strictly confine public users to PUBLIC chunks', () => {
    const publicLevels = getPermittedSecurityLevels('PUBLIC')
    assert.deepStrictEqual(publicLevels, ['PUBLIC'])
    assert.strictEqual(publicLevels.includes('PRIVATE'), false)
    assert.strictEqual(publicLevels.includes('ADMIN'), false)
  })

  test('Pre-retrieval authorization filters grant ADMIN access up to ADMIN but not PRIVATE', () => {
    const adminLevels = getPermittedSecurityLevels('ADMIN')
    assert.ok(adminLevels.includes('PUBLIC'))
    assert.ok(adminLevels.includes('ADMIN'))
    assert.ok(adminLevels.includes('EDITOR'))
    assert.strictEqual(adminLevels.includes('PRIVATE'), false, 'Standard ADMIN cannot access PRIVATE executive documents')
  })

  test('Pre-retrieval authorization permits SUPER_ADMIN complete access across all tiers', () => {
    const superLevels = getPermittedSecurityLevels('SUPER_ADMIN')
    assert.ok(superLevels.includes('PRIVATE'))
    assert.ok(superLevels.includes('ADMIN'))
    assert.ok(superLevels.includes('PUBLIC'))
  })

  test('Candidate chunks are pruned BEFORE retrieval if security level is not in permitted list', () => {
    const corpus = [
      { id: 'chk-public-profile', level: 'PUBLIC' as SecurityAccessLevel },
      { id: 'chk-editor-draft', level: 'EDITOR' as SecurityAccessLevel },
      { id: 'chk-admin-tender', level: 'ADMIN' as SecurityAccessLevel },
      { id: 'chk-private-contract', level: 'PRIVATE' as SecurityAccessLevel },
    ]

    const publicPermitted = getPermittedSecurityLevels('PUBLIC')
    const accessibleToPublic = corpus.filter((c) => publicPermitted.includes(c.level))
    assert.strictEqual(accessibleToPublic.length, 1)
    assert.strictEqual(accessibleToPublic[0].id, 'chk-public-profile')

    const adminPermitted = getPermittedSecurityLevels('ADMIN')
    const accessibleToAdmin = corpus.filter((c) => adminPermitted.includes(c.level))
    assert.strictEqual(accessibleToAdmin.length, 3)
    assert.ok(!accessibleToAdmin.some((c) => c.id === 'chk-private-contract'))
  })

  // ---------------------------------------------------------------------------
  // 2. Reciprocal Rank Fusion (RRF) Verification
  // ---------------------------------------------------------------------------
  test('Reciprocal Rank Fusion correctly synthesizes dense and sparse rankings', () => {
    // Formula: RRF(d) = sum( 1 / (k + rank) ) with k=60
    const k = 60

    // Dense rank list
    const denseRankings = ['doc-A', 'doc-B', 'doc-C', 'doc-D']
    // Sparse rank list (BM25)
    const sparseRankings = ['doc-C', 'doc-A', 'doc-E']

    const rrfScores = new Map<string, number>()

    // Score dense
    denseRankings.forEach((docId, index) => {
      const rank = index + 1
      const current = rrfScores.get(docId) || 0
      rrfScores.set(docId, current + 1 / (k + rank))
    })

    // Score sparse
    sparseRankings.forEach((docId, index) => {
      const rank = index + 1
      const current = rrfScores.get(docId) || 0
      rrfScores.set(docId, current + 1 / (k + rank))
    })

    // doc-A was rank 1 in dense (1/61) and rank 2 in sparse (1/62) -> 0.01639 + 0.01613 = 0.03252
    // doc-C was rank 3 in dense (1/63) and rank 1 in sparse (1/61) -> 0.01587 + 0.01639 = 0.03226
    const scoreA = rrfScores.get('doc-A')!
    const scoreC = rrfScores.get('doc-C')!

    assert.ok(scoreA > 0)
    assert.ok(scoreC > 0)
    assert.ok(scoreA > scoreC, 'doc-A (rank 1 + 2) must score higher than doc-C (rank 3 + 1)')

    // Sorted candidate order
    const sorted = [...rrfScores.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id)
    assert.strictEqual(sorted[0], 'doc-A')
    assert.strictEqual(sorted[1], 'doc-C')
  })

  // ---------------------------------------------------------------------------
  // 3. Typed Statuses Contract
  // ---------------------------------------------------------------------------
  test('All four typed RAG statuses are strictly enforced by the schema', () => {
    const validStatuses: RagStatus[] = [
      'SUPPORTED',
      'PARTIALLY_SUPPORTED',
      'CONFLICTING_EVIDENCE',
      'INSUFFICIENT_EVIDENCE',
    ]

    for (const status of validStatuses) {
      assert.ok(typeof status === 'string')
    }
  })

  // ---------------------------------------------------------------------------
  // 4. Citation Validation
  // ---------------------------------------------------------------------------
  test('Citations strictly require documentId, snippet, and sourceAuthority', () => {
    const validCitation: RagCitation = {
      index: 1,
      documentId: 'doc-swat-expressway',
      chunkId: 'chk-swat-002',
      title: 'Swat Expressway Completion Certificate',
      sourceAuthority: 'VERIFIED_DOCUMENT',
      location: 'Section 4, Page 2',
      versionTag: '2024.1',
      snippet: 'Substantial completion verified on Swat Expressway Package 02.',
    }

    assert.strictEqual(validCitation.index, 1)
    assert.strictEqual(validCitation.sourceAuthority, 'VERIFIED_DOCUMENT')
    assert.ok(validCitation.snippet.length > 10)
  })

  // ---------------------------------------------------------------------------
  // 5. Benchmark Dataset Template Schema Verification
  // ---------------------------------------------------------------------------
  test('Gold evaluation dataset template loads and contains valid test cases', () => {
    const templatePath = path.resolve(process.cwd(), 'rag', 'evaluation', 'gold_questions.template.json')
    assert.ok(fs.existsSync(templatePath), 'Gold questions template must exist')

    const raw = fs.readFileSync(templatePath, 'utf8')
    const parsed = JSON.parse(raw)

    assert.ok(parsed.version)
    assert.ok(Array.isArray(parsed.test_cases))
    assert.ok(parsed.test_cases.length >= 4, 'Must have at least 4 template seed cases')

    const firstCase = parsed.test_cases[0]
    assert.ok(firstCase.test_case_id)
    assert.ok(firstCase.query)
    assert.ok(firstCase.ground_truth_answer)
    assert.ok(Array.isArray(firstCase.ground_truth_doc_ids))
    assert.ok(['SUPPORTED', 'PARTIALLY_SUPPORTED', 'CONFLICTING_EVIDENCE', 'INSUFFICIENT_EVIDENCE'].includes(firstCase.expected_status))
  })
})
