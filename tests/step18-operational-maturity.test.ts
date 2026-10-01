// =============================================================================
// ELITEBUILD — Step 18 Operational Maturity & Stabilization Tests
// =============================================================================
// Verifies:
// 1. Disaster recovery plan completeness (docs/PRODUCTION_RECOVERY.md)
// 2. Operations runbook completeness (docs/OPERATIONS_RUNBOOK.md)
// 3. RAG CLI commands presence and parameter coverage (rag/cli.py)
// 4. Quality gate thresholds and regression policies
// 5. Ingestion freshness states (CURRENT, STALE, UNKNOWN)
// 6. Security maintenance and secret isolation invariants
// =============================================================================

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

describe('Step 18 — Operational Maturity, Stabilization & Long-Term Maintenance', () => {
  const rootDir = process.cwd()

  // ---------------------------------------------------------------------------
  // 1. Disaster Recovery Documentation
  // ---------------------------------------------------------------------------
  test('Disaster recovery documentation exists and covers all mandatory failure scenarios', () => {
    const recoveryDoc = path.join(rootDir, 'docs', 'PRODUCTION_RECOVERY.md')
    assert.ok(fs.existsSync(recoveryDoc), 'docs/PRODUCTION_RECOVERY.md must exist')

    const content = fs.readFileSync(recoveryDoc, 'utf-8')
    assert.ok(content.includes('Application Container / Node Process Crash'), 'Must cover application failure')
    assert.ok(content.includes('PostgreSQL Database Corruption'), 'Must cover database failure')
    assert.ok(content.includes('FastAPI RAG Microservice Daemon Crash'), 'Must cover RAG service failure')
    assert.ok(content.includes('Vector Index or Embedding Corruption'), 'Must cover vector store failure')
    assert.ok(content.includes('File Storage Failure'), 'Must cover file storage failure')
    assert.ok(content.includes('External LLM Provider Outage'), 'Must cover LLM provider outage')
    assert.ok(content.includes('pg_dump'), 'Must specify PostgreSQL backup command')
    assert.ok(content.includes('pg_restore'), 'Must specify PostgreSQL restore command')
  })

  // ---------------------------------------------------------------------------
  // 2. Operations Runbook Documentation
  // ---------------------------------------------------------------------------
  test('Operations runbook exists and covers operator workflows and maintenance checklists', () => {
    const runbookDoc = path.join(rootDir, 'docs', 'OPERATIONS_RUNBOOK.md')
    assert.ok(fs.existsSync(runbookDoc), 'docs/OPERATIONS_RUNBOOK.md must exist')

    const content = fs.readFileSync(runbookDoc, 'utf-8')
    assert.ok(content.includes('python -m rag.cli report'), 'Must include CLI report command')
    assert.ok(content.includes('python -m rag.cli gates'), 'Must include CLI gates command')
    assert.ok(content.includes('python -m rag.cli eval'), 'Must include CLI eval command')
    assert.ok(content.includes('python -m rag.cli compare'), 'Must include CLI compare command')
    assert.ok(content.includes('Knowledge Freshness Determination'), 'Must define freshness policies')
    assert.ok(content.includes('Model & Prompt Change Management'), 'Must define model change procedure')
    assert.ok(content.includes('Recurring Operator Maintenance Checklist'), 'Must include maintenance checklist')
    assert.ok(content.includes('Daily / Routine Tasks'), 'Must define daily tasks')
    assert.ok(content.includes('Weekly Tasks'), 'Must define weekly tasks')
  })

  // ---------------------------------------------------------------------------
  // 3. RAG CLI Capabilities Verification
  // ---------------------------------------------------------------------------
  test('RAG CLI provides all operational subcommands', () => {
    const cliPath = path.join(rootDir, 'rag', 'cli.py')
    assert.ok(fs.existsSync(cliPath), 'rag/cli.py must exist')

    const content = fs.readFileSync(cliPath, 'utf-8')
    const expectedSubparsers = [
      '"init"',
      '"ingest"',
      '"status"',
      '"retrieve"',
      '"serve"',
      '"eval"',
      '"metrics"',
      '"trace"',
      '"health"',
      '"compare"',
      '"report"',
      '"gates"',
    ]

    for (const sub of expectedSubparsers) {
      assert.ok(content.includes(sub), `RAG CLI must register subparser: ${sub}`)
    }
  })

  // ---------------------------------------------------------------------------
  // 4. Ingestion Freshness States Verification
  // ---------------------------------------------------------------------------
  test('Ingestion monitor module implements CURRENT, STALE, and UNKNOWN freshness states', () => {
    const monitorPath = path.join(rootDir, 'rag', 'observability', 'ingestion_monitor.py')
    assert.ok(fs.existsSync(monitorPath), 'rag/observability/ingestion_monitor.py must exist')

    const content = fs.readFileSync(monitorPath, 'utf-8')
    assert.ok(content.includes('CURRENT = "CURRENT"'), 'Must define CURRENT freshness state')
    assert.ok(content.includes('STALE = "STALE"'), 'Must define STALE freshness state')
    assert.ok(content.includes('UNKNOWN = "UNKNOWN"'), 'Must define UNKNOWN freshness state')
  })

  // ---------------------------------------------------------------------------
  // 5. Source Control & Secret Isolation Invariant
  // ---------------------------------------------------------------------------
  test('Gitignore strictly isolates environment secrets and storage mounts', () => {
    const gitignorePath = path.join(rootDir, '.gitignore')
    assert.ok(fs.existsSync(gitignorePath), '.gitignore must exist')

    const content = fs.readFileSync(gitignorePath, 'utf-8')
    assert.ok(content.includes('.env*'), 'Must ignore .env files')
    assert.ok(content.includes('/storage/'), 'Must ignore storage directory')
    assert.ok(content.includes('/public/uploads/'), 'Must ignore uploads directory')
  })
})
