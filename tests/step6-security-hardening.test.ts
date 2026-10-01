// =============================================================================
// ELITEBUILD — Step 6 Security, Performance & Hardening Test Suite
// =============================================================================

import { test, describe } from 'node:test'
import assert from 'node:assert'
import {
  canManageUsers,
  canManageSettings,
  canManageContent,
  canManageDocuments,
  canViewAuditLogs,
} from '../lib/auth/permissions.ts'
import { getAuthSecret } from '../lib/auth/secret.ts'
import { stripHtml, sanitize, createSlug, getClientIp } from '../lib/security/sanitize.ts'
import { checkRateLimit } from '../lib/security/rate-limit.ts'
import { inquirySchema, loginSchema } from '../lib/validation.ts'

describe('Step 6 — Authentication & Production Hardening', () => {
  // -------------------------------------------------------------------------
  // 1. AUTH_SECRET Security & Production Behavior
  // -------------------------------------------------------------------------
  test('getAuthSecret returns byte buffer and enforces production requirements', () => {
    const originalEnv = process.env.NODE_ENV
    const originalSecret = process.env.AUTH_SECRET

    const envMap = process.env as Record<string, string | undefined>
    try {
      // In development/test, fallback is allowed
      envMap['NODE_ENV'] = 'test'
      delete process.env.AUTH_SECRET
      const devSecret = getAuthSecret()
      assert.ok(devSecret instanceof Uint8Array)
      assert.ok(devSecret.length > 0)

      // In production, missing AUTH_SECRET must throw error
      envMap['NODE_ENV'] = 'production'
      delete process.env.AUTH_SECRET
      assert.throws(() => {
        getAuthSecret()
      }, /AUTH_SECRET environment variable is missing in production/)

      // In production with valid secret, returns encoded buffer
      process.env.AUTH_SECRET = 'super-secure-production-random-secret-key-32b'
      const prodSecret = getAuthSecret()
      assert.ok(prodSecret instanceof Uint8Array)
      assert.strictEqual(
        new TextDecoder().decode(prodSecret),
        'super-secure-production-random-secret-key-32b',
      )
    } finally {
      if (originalEnv !== undefined) {
        envMap['NODE_ENV'] = originalEnv
      } else {
        delete envMap['NODE_ENV']
      }
      process.env.AUTH_SECRET = originalSecret
    }
  })

  // -------------------------------------------------------------------------
  // 2. RBAC Access Matrix Across All Roles
  // -------------------------------------------------------------------------
  test('RBAC matrix strictly separates permissions across SUPER_ADMIN, ADMIN, and EDITOR', () => {
    // SUPER_ADMIN
    assert.strictEqual(canManageUsers('SUPER_ADMIN'), true)
    assert.strictEqual(canManageSettings('SUPER_ADMIN'), true)
    assert.strictEqual(canManageContent('SUPER_ADMIN'), true)
    assert.strictEqual(canManageDocuments('SUPER_ADMIN'), true)
    assert.strictEqual(canViewAuditLogs('SUPER_ADMIN'), true)

    // ADMIN
    assert.strictEqual(canManageUsers('ADMIN'), false)
    assert.strictEqual(canManageSettings('ADMIN'), false)
    assert.strictEqual(canManageContent('ADMIN'), true)
    assert.strictEqual(canManageDocuments('ADMIN'), true)
    assert.strictEqual(canViewAuditLogs('ADMIN'), false)

    // EDITOR
    assert.strictEqual(canManageUsers('EDITOR'), false)
    assert.strictEqual(canManageSettings('EDITOR'), false)
    assert.strictEqual(canManageContent('EDITOR'), true)
    assert.strictEqual(canManageDocuments('EDITOR'), false)
    assert.strictEqual(canViewAuditLogs('EDITOR'), false)
  })

  // -------------------------------------------------------------------------
  // 3. Input Sanitization & XSS Protections
  // -------------------------------------------------------------------------
  test('Input sanitization utilities neutralize HTML and script injection attempts', () => {
    // Strips script tags
    const malicious = '<script>alert("xss")</script>Engineering Scope'
    assert.strictEqual(stripHtml(malicious), 'Engineering Scope')

    // Strips img tags with inline onerror
    const imgXss = '<img src=x onerror=alert(1)>Bridge construction'
    assert.strictEqual(stripHtml(imgXss), 'Bridge construction')

    // Trims whitespace
    assert.strictEqual(sanitize('   <b>Road Widening</b>   '), 'Road Widening')

    // URL slug sanitization
    assert.strictEqual(
      createSlug('Peshawar-Ring Road / Rehabilitation & Maintenance #2024!'),
      'peshawar-ring-road-rehabilitation-maintenance-2024',
    )
  })

  // -------------------------------------------------------------------------
  // 4. Rate Limiting Enforcement
  // -------------------------------------------------------------------------
  test('Rate limiter restricts excessive requests within configured window', () => {
    const testId = `test-ip-${Date.now()}`
    const config = { windowMs: 10000, maxRequests: 3 }

    // 1st request
    const r1 = checkRateLimit(testId, config)
    assert.strictEqual(r1.allowed, true)
    assert.strictEqual(r1.remaining, 2)

    // 2nd request
    const r2 = checkRateLimit(testId, config)
    assert.strictEqual(r2.allowed, true)
    assert.strictEqual(r2.remaining, 1)

    // 3rd request
    const r3 = checkRateLimit(testId, config)
    assert.strictEqual(r3.allowed, true)
    assert.strictEqual(r3.remaining, 0)

    // 4th request -> blocked
    const r4 = checkRateLimit(testId, config)
    assert.strictEqual(r4.allowed, false)
    assert.strictEqual(r4.remaining, 0)
    assert.ok(r4.resetIn > 0)
  })

  // -------------------------------------------------------------------------
  // 5. Client IP Resolution & Security
  // -------------------------------------------------------------------------
  test('getClientIp safely parses forwarded and real IP headers', () => {
    // Single IP
    const req1 = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '203.0.113.195' },
    })
    assert.strictEqual(getClientIp(req1), '203.0.113.195')

    // Multiple forwarded IPs (first is client IP)
    const req2 = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '203.0.113.195, 198.51.100.17, 192.0.2.1' },
    })
    assert.strictEqual(getClientIp(req2), '203.0.113.195')

    // x-real-ip fallback
    const req3 = new Request('http://localhost', {
      headers: { 'x-real-ip': '198.51.100.22' },
    })
    assert.strictEqual(getClientIp(req3), '198.51.100.22')

    // unknown fallback
    const req4 = new Request('http://localhost')
    assert.strictEqual(getClientIp(req4), 'unknown')
  })

  // -------------------------------------------------------------------------
  // 6. Validation Security
  // -------------------------------------------------------------------------
  test('Validation schemas reject malformed authentication and inquiry payloads', () => {
    // Malformed login
    assert.strictEqual(loginSchema.safeParse({ email: 'bad-email', password: '123' }).success, false)
    assert.strictEqual(loginSchema.safeParse({ email: 'admin@elitebuild.pk', password: '' }).success, false)

    // Valid login
    assert.strictEqual(
      loginSchema.safeParse({ email: 'admin@elitebuild.pk', password: 'StrongPassword123!' }).success,
      true,
    )

    // Malformed inquiry
    assert.strictEqual(
      inquirySchema.safeParse({ name: '', email: 'not-an-email', message: '' }).success,
      false,
    )

    // Valid inquiry
    assert.strictEqual(
      inquirySchema.safeParse({
        name: 'Engr. Bilal Ahmad',
        email: 'bilal@c-and-w.gov.pk',
        message: 'Inquiry regarding highway rehabilitation contract specifications and pre-qualification.',
        phone: '+92 300 1234567',
        preferredContactMethod: 'email',
      }).success,
      true,
    )
  })
})
