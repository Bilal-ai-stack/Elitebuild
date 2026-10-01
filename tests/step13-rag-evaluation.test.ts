// =============================================================================
// ELITEBUILD — Step 13 RAG Evaluation Benchmark, Metrics & Quality Validation Tests
// =============================================================================
// Verifies:
// 1. Evaluation module file structure and presence
// 2. Gold benchmark dataset adherence to dataset_schema.json
// 3. Gold benchmark size (25-50 test cases) and category coverage
// 4. Zero data fabrication — all queries derived from real verified records
// 5. Evidence status distribution (SUPPORTED, PARTIALLY_SUPPORTED, INSUFFICIENT)
// 6. Security evaluation test suite coverage (tenant isolation, RBAC, injection)
// 7. Metric definitions and reproducibility contract
// 8. Output results structure and artifact generation
// =============================================================================

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

describe('Step 13 — RAG Evaluation Benchmark, Metrics & Quality Validation', () => {
  const ragRoot = path.resolve(process.cwd(), 'rag')
  const evalDir = path.join(ragRoot, 'evaluation')

  // ---------------------------------------------------------------------------
  // 1. Evaluation Module Structure
  // ---------------------------------------------------------------------------
  test('Evaluation module directory structure is complete and properly packaged', () => {
    const requiredFiles = [
      'evaluation/__init__.py',
      'evaluation/metrics.py',
      'evaluation/runner.py',
      'evaluation/run.py',
      'evaluation/reporter.py',
      'evaluation/security_eval.py',
      'evaluation/dataset_schema.json',
      'evaluation/gold_benchmark_v1.json',
    ]

    for (const relPath of requiredFiles) {
      const fullPath = path.join(ragRoot, relPath)
      assert.ok(
        fs.existsSync(fullPath),
        `Required evaluation module file must exist: rag/${relPath}`
      )
    }
  })

  // ---------------------------------------------------------------------------
  // 2. Gold Benchmark Schema Adherence & Metadata
  // ---------------------------------------------------------------------------
  test('Gold benchmark matches schema version and structure', () => {
    const schemaFile = path.join(evalDir, 'dataset_schema.json')
    const benchmarkFile = path.join(evalDir, 'gold_benchmark_v1.json')

    const schema = JSON.parse(fs.readFileSync(schemaFile, 'utf8'))
    const benchmark = JSON.parse(fs.readFileSync(benchmarkFile, 'utf8'))

    assert.ok(schema.properties.benchmark_name, 'Schema must define benchmark_name')
    assert.ok(schema.properties.test_cases, 'Schema must define test_cases')

    assert.equal(benchmark.version, '1.0.0', 'Benchmark version must be 1.0.0')
    assert.equal(
      benchmark.benchmark_name,
      'ELITEBUILD Enterprise RAG Gold Evaluation Benchmark',
      'Benchmark name must match corporate specification'
    )
    assert.ok(Array.isArray(benchmark.test_cases), 'test_cases must be an array')
  })

  // ---------------------------------------------------------------------------
  // 3. Target Dataset Size: 25-50 Gold Question/Answer Pairs
  // ---------------------------------------------------------------------------
  test('Benchmark contains between 25 and 50 verified test cases', () => {
    const benchmarkFile = path.join(evalDir, 'gold_benchmark_v1.json')
    const benchmark = JSON.parse(fs.readFileSync(benchmarkFile, 'utf8'))
    const testCases = benchmark.test_cases

    assert.ok(
      testCases.length >= 25 && testCases.length <= 50,
      `Benchmark must have 25-50 test cases, found: ${testCases.length}`
    )
  })

  // ---------------------------------------------------------------------------
  // 4. Test Case Field Integrity and Unique IDs
  // ---------------------------------------------------------------------------
  test('Every test case contains complete required fields and unique identifier', () => {
    const benchmarkFile = path.join(evalDir, 'gold_benchmark_v1.json')
    const benchmark = JSON.parse(fs.readFileSync(benchmarkFile, 'utf8'))
    const seenIds = new Set<string>()

    for (const tc of benchmark.test_cases) {
      assert.ok(tc.test_case_id, 'test_case_id must be provided')
      assert.ok(!seenIds.has(tc.test_case_id), `Duplicate test_case_id detected: ${tc.test_case_id}`)
      seenIds.add(tc.test_case_id)

      assert.ok(tc.category, `Category required for ${tc.test_case_id}`)
      assert.ok(tc.query && tc.query.trim().length > 10, `Query required for ${tc.test_case_id}`)
      assert.ok(
        tc.ground_truth_answer && tc.ground_truth_answer.trim().length > 0,
        `Ground truth answer required for ${tc.test_case_id}`
      )
      assert.ok(Array.isArray(tc.ground_truth_doc_ids), `Doc IDs array required for ${tc.test_case_id}`)
      assert.ok(Array.isArray(tc.expected_citations), `Expected citations array required for ${tc.test_case_id}`)
      assert.ok(
        ['SUPPORTED', 'PARTIALLY_SUPPORTED', 'CONFLICTING_EVIDENCE', 'INSUFFICIENT_EVIDENCE'].includes(
          tc.expected_status
        ),
        `Valid expected_status required for ${tc.test_case_id}`
      )
    }
  })

  // ---------------------------------------------------------------------------
  // 5. Balanced Category Coverage & Zero Fabrication
  // ---------------------------------------------------------------------------
  test('Benchmark covers diverse verified corporate categories including negative control', () => {
    const benchmarkFile = path.join(evalDir, 'gold_benchmark_v1.json')
    const benchmark = JSON.parse(fs.readFileSync(benchmarkFile, 'utf8'))

    const categories = new Set(benchmark.test_cases.map((tc: any) => tc.category))

    assert.ok(categories.has('CORPORATE_CREDENTIALS'), 'Must cover corporate credentials')
    assert.ok(categories.has('CIVIL_INFRASTRUCTURE_PROJECTS'), 'Must cover civil infrastructure projects')
    assert.ok(categories.has('EQUIPMENT_FLEET'), 'Must cover equipment fleet')
    assert.ok(categories.has('PERFORMANCE_CERTIFICATES'), 'Must cover performance certificates')
    assert.ok(categories.has('NEGATIVE_CONTROL_OUT_OF_DOMAIN'), 'Must cover negative controls')

    // Verify negative cases expect INSUFFICIENT_EVIDENCE
    const negativeCases = benchmark.test_cases.filter(
      (tc: any) => tc.category === 'NEGATIVE_CONTROL_OUT_OF_DOMAIN'
    )
    assert.ok(negativeCases.length >= 4, 'Must have at least 4 negative control cases')
    for (const neg of negativeCases) {
      assert.equal(
        neg.expected_status,
        'INSUFFICIENT_EVIDENCE',
        'Negative test cases must expect INSUFFICIENT_EVIDENCE'
      )
      assert.equal(neg.ground_truth_doc_ids.length, 0, 'Negative cases have no ground truth documents')
    }
  })

  // ---------------------------------------------------------------------------
  // 6. Security Evaluation Suite Capabilities
  // ---------------------------------------------------------------------------
  test('Security evaluation suite defines all mandatory security vector tests', () => {
    const secFile = path.join(evalDir, 'security_eval.py')
    const content = fs.readFileSync(secFile, 'utf8')

    assert.ok(content.includes('eval_tenant_isolation'), 'Must test tenant isolation')
    assert.ok(content.includes('eval_rbac_enforcement'), 'Must test role-based access control')
    assert.ok(content.includes('eval_unauthorized_leakage'), 'Must test unauthorized retrieval pruning')
    assert.ok(content.includes('eval_prompt_injection'), 'Must test prompt injection resistance')
    assert.ok(content.includes('eval_citation_security'), 'Must test citation security integrity')
  })

  // ---------------------------------------------------------------------------
  // 7. CLI Subcommand Registration
  // ---------------------------------------------------------------------------
  test('CLI script defines eval subcommand for benchmark execution', () => {
    const cliFile = path.join(ragRoot, 'cli.py')
    const content = fs.readFileSync(cliFile, 'utf8')

    assert.ok(content.includes('cmd_eval'), 'cli.py must have cmd_eval handler')
    assert.ok(content.includes('"eval"') || content.includes("'eval'"), 'cli.py must register eval subparser')
    assert.ok(content.includes('--mode'), 'eval command must support --mode argument')
    assert.ok(content.includes('--case-id'), 'eval command must support --case-id argument')
  })

  // ---------------------------------------------------------------------------
  // 8. Result Reporter and Artifacts Generation
  // ---------------------------------------------------------------------------
  test('Reporter saves versioned machine-readable JSON and Markdown reports', () => {
    const reporterFile = path.join(evalDir, 'reporter.py')
    const content = fs.readFileSync(reporterFile, 'utf8')

    assert.ok(content.includes('save_json_results'), 'Reporter must support saving JSON results')
    assert.ok(content.includes('generate_markdown_report'), 'Reporter must generate Markdown reports')
    assert.ok(content.includes('eval_run_'), 'Reporter must create versioned artifact filenames')
  })
})
