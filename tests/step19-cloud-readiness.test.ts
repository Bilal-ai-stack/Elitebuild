// =============================================================================
// ELITEBUILD — Step 19 Cloud Readiness & Vercel Deployment Tests
// =============================================================================
// Verifies:
// 1. Groq API key isolation and absence of NEXT_PUBLIC_ secret leaks
// 2. Groq provider health status enumeration & interface compliance
// 3. Vercel deployment documentation & decoupled Python microservice boundary
// 4. Cloud environment configuration matrix & variable classifications
// 5. Persistent storage cloud readiness declarations
// 6. Production authentication invariants (no fallback secret in production)
// 7. Security headers in next.config.mjs
// 8. RAG query proxy role spoofing prevention
// =============================================================================

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

describe('Step 19 — Groq Cloud Integration & Vercel Deployment Readiness', () => {
  const rootDir = process.cwd()

  // ---------------------------------------------------------------------------
  // 1. Groq Key Security & NEXT_PUBLIC_ Audit
  // ---------------------------------------------------------------------------
  test('Secrets are strictly isolated and never exposed via NEXT_PUBLIC_ variables', () => {
    const envExamplePath = path.join(rootDir, '.env.example')
    assert.ok(fs.existsSync(envExamplePath), '.env.example must exist')

    const content = fs.readFileSync(envExamplePath, 'utf-8')
    assert.ok(!content.includes('NEXT_PUBLIC_GROQ'), 'GROQ_API_KEY must never be prefixed with NEXT_PUBLIC_')
    assert.ok(!content.includes('NEXT_PUBLIC_DATABASE'), 'DATABASE_URL must never be prefixed with NEXT_PUBLIC_')
    assert.ok(!content.includes('NEXT_PUBLIC_AUTH_SECRET'), 'AUTH_SECRET must never be prefixed with NEXT_PUBLIC_')
    assert.ok(!content.includes('NEXT_PUBLIC_RAG_SERVICE_API_KEY'), 'RAG_SERVICE_API_KEY must never be public')

    // Verify gitignore isolates environment secrets
    const gitignorePath = path.join(rootDir, '.gitignore')
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8')
    assert.ok(gitignoreContent.includes('.env*'), '.gitignore must ignore .env*')
  })

  // ---------------------------------------------------------------------------
  // 2. Groq Provider Health Status Model & Diagnostics
  // ---------------------------------------------------------------------------
  test('Groq LLM Provider defines all required typed health statuses', () => {
    const providerPath = path.join(rootDir, 'rag', 'generation', 'llm_provider.py')
    assert.ok(fs.existsSync(providerPath), 'rag/generation/llm_provider.py must exist')

    const content = fs.readFileSync(providerPath, 'utf-8')
    assert.ok(content.includes('GROQ_CONFIGURED'), 'Must define GROQ_CONFIGURED status')
    assert.ok(content.includes('GROQ_NOT_CONFIGURED'), 'Must define GROQ_NOT_CONFIGURED status')
    assert.ok(content.includes('GROQ_AUTH_FAILED'), 'Must define GROQ_AUTH_FAILED status')
    assert.ok(content.includes('GROQ_RATE_LIMITED'), 'Must define GROQ_RATE_LIMITED status')
    assert.ok(content.includes('GROQ_HEALTHY'), 'Must define GROQ_HEALTHY status')
    assert.ok(content.includes('def check_health('), 'Groq provider must implement check_health method')
  })

  // ---------------------------------------------------------------------------
  // 3. Vercel Deployment Architecture Documentation
  // ---------------------------------------------------------------------------
  test('Vercel deployment documentation exists and defines the decoupled hosting boundary', () => {
    const vercelDocPath = path.join(rootDir, 'docs', 'VERCEL_DEPLOYMENT.md')
    assert.ok(fs.existsSync(vercelDocPath), 'docs/VERCEL_DEPLOYMENT.md must exist')

    const content = fs.readFileSync(vercelDocPath, 'utf-8')
    assert.ok(content.includes('Next.js 16 Web Application'), 'Must define Next.js hosting on Vercel')
    assert.ok(content.includes('FastAPI RAG Microservice'), 'Must define FastAPI hosting boundary')
    assert.ok(content.includes('Containerized Cloud Host'), 'Must specify containerized hosting for Python ML service')
    assert.ok(content.includes('PERSISTENT STORAGE REQUIRED'), 'Must document persistent storage requirement')
  })

  // ---------------------------------------------------------------------------
  // 4. Cloud Environment Configuration Matrix
  // ---------------------------------------------------------------------------
  test('Cloud environment matrix document classifies variables across lifecycle and scopes', () => {
    const cloudDocPath = path.join(rootDir, 'docs', 'CLOUD_ENVIRONMENT.md')
    assert.ok(fs.existsSync(cloudDocPath), 'docs/CLOUD_ENVIRONMENT.md must exist')

    const content = fs.readFileSync(cloudDocPath, 'utf-8')
    assert.ok(content.includes('SERVER_ONLY'), 'Must classify server-only variables')
    assert.ok(content.includes('BUILD_TIME'), 'Must classify build-time variables')
    assert.ok(content.includes('RUNTIME'), 'Must classify runtime variables')
    assert.ok(content.includes('REQUIRED'), 'Must classify required variables')
    assert.ok(content.includes('SECRET'), 'Must classify secret variables')
    assert.ok(content.includes('CORS_ALLOWED_ORIGINS'), 'Must document CORS_ALLOWED_ORIGINS')
  })

  // ---------------------------------------------------------------------------
  // 5. Production Authentication Invariants
  // ---------------------------------------------------------------------------
  test('Authentication secret utility refuses to fall back in production environment', () => {
    const secretPath = path.join(rootDir, 'lib', 'auth', 'secret.ts')
    assert.ok(fs.existsSync(secretPath), 'lib/auth/secret.ts must exist')

    const content = fs.readFileSync(secretPath, 'utf-8')
    assert.ok(content.includes("process.env.NODE_ENV === 'production'"), 'Must check production environment')
    assert.ok(content.includes('FATAL: AUTH_SECRET'), 'Must throw fatal error if AUTH_SECRET is missing in production')
  })

  // ---------------------------------------------------------------------------
  // 6. Security Headers Invariant in Next.js Config
  // ---------------------------------------------------------------------------
  test('Next.js config defines comprehensive production security headers', () => {
    const configPath = path.join(rootDir, 'next.config.mjs')
    assert.ok(fs.existsSync(configPath), 'next.config.mjs must exist')

    const content = fs.readFileSync(configPath, 'utf-8')
    assert.ok(content.includes('Strict-Transport-Security'), 'Must enforce HSTS')
    assert.ok(content.includes('X-Content-Type-Options'), 'Must enforce nosniff')
    assert.ok(content.includes('X-Frame-Options'), 'Must enforce SAMEORIGIN')
    assert.ok(content.includes('Content-Security-Policy'), 'Must configure CSP')
  })

  // ---------------------------------------------------------------------------
  // 7. RAG Query Proxy Role Spoofing Prevention
  // ---------------------------------------------------------------------------
  test('RAG Query proxy enforces server-side role resolution and prevents client body spoofing', () => {
    const proxyPath = path.join(rootDir, 'app', 'api', 'rag', 'query', 'route.ts')
    assert.ok(fs.existsSync(proxyPath), 'app/api/rag/query/route.ts must exist')

    const content = fs.readFileSync(proxyPath, 'utf-8')
    assert.ok(content.includes('const session = await getSession()'), 'Must resolve session server-side')
    assert.ok(content.includes('const userRole = session?.role || \'PUBLIC\''), 'Must fallback to PUBLIC role')
    assert.ok(content.includes('\'X-User-Role\': userRole'), 'Must inject verified role in header')
    assert.ok(content.includes('INSUFFICIENT_EVIDENCE'), 'Must return degraded fallback on microservice offline')
  })
})
