// =============================================================================
// ELITEBUILD — Step 4 Content Management Test Suite
// =============================================================================

import { test, describe } from 'node:test'
import assert from 'node:assert'
import {
  teamMemberSchema,
  clientOrganizationSchema,
  performanceCertificateSchema,
} from '../lib/validation.ts'
import {
  canManageContent,
  canManageDocuments,
  canManageUsers,
} from '../lib/auth/permissions.ts'

describe('Step 4 — Admin Content Management Validation & Security', () => {
  // -------------------------------------------------------------------------
  // 1. TeamMember Validation
  // -------------------------------------------------------------------------
  test('teamMemberSchema validates correct member inputs and rejects invalid inputs', () => {
    // Valid input
    const valid = {
      name: 'Engr. Muhammad Tariq',
      title: 'Senior Project Engineer',
      department: 'Civil Infrastructure',
      bio: 'Over 15 years experience in highway and bridge structures.',
      photoUrl: 'https://example.com/photo.jpg',
      email: 'm.tariq@elitebuild.pk',
      phone: '+92 300 1234567',
      displayOrder: 1,
      active: true,
    }
    const parsed = teamMemberSchema.safeParse(valid)
    assert.strictEqual(parsed.success, true)

    // Name is required
    const missingName = teamMemberSchema.safeParse({ name: '' })
    assert.strictEqual(missingName.success, false)

    // Negative display order rejected
    const negativeOrder = teamMemberSchema.safeParse({ name: 'Ali', displayOrder: -1 })
    assert.strictEqual(negativeOrder.success, false)

    // Invalid email rejected
    const invalidEmail = teamMemberSchema.safeParse({ name: 'Ali', email: 'not-an-email' })
    assert.strictEqual(invalidEmail.success, false)

    // Invalid phone regex rejected
    const invalidPhone = teamMemberSchema.safeParse({ name: 'Ali', phone: 'invalid-phone-abc!@#' })
    assert.strictEqual(invalidPhone.success, false)
  })

  // -------------------------------------------------------------------------
  // 2. ClientOrganization Validation
  // -------------------------------------------------------------------------
  test('clientOrganizationSchema validates organizational inputs', () => {
    // Valid client organization
    const validOrg = {
      name: 'Communication & Works Department, Government of Khyber Pakhtunkhwa',
      shortName: 'C&W KP',
      description: 'Provincial authority responsible for highway infrastructure.',
      website: 'https://cwd.kp.gov.pk',
      displayOrder: 2,
      active: true,
    }
    const parsed = clientOrganizationSchema.safeParse(validOrg)
    assert.strictEqual(parsed.success, true)

    // Name required
    const missingName = clientOrganizationSchema.safeParse({ name: '' })
    assert.strictEqual(missingName.success, false)

    // Invalid URL rejected
    const invalidUrl = clientOrganizationSchema.safeParse({
      name: 'NHA',
      website: 'not-a-valid-url',
    })
    assert.strictEqual(invalidUrl.success, false)
  })

  // -------------------------------------------------------------------------
  // 3. PerformanceCertificate Validation
  // -------------------------------------------------------------------------
  test('performanceCertificateSchema validates certificate details', () => {
    // Valid certificate
    const validCert = {
      title: 'Substantial Completion Certificate — Swat Expressway Bridge Works',
      projectId: 'proj-12345',
      issuedById: 'org-67890',
      issueDate: '2024-05-15',
      description: 'Satisfactory completion of dual-span prestressed girder bridge.',
      documentUrl: '/api/documents/doc-123/download',
      verified: true,
      active: true,
    }
    const parsed = performanceCertificateSchema.safeParse(validCert)
    assert.strictEqual(parsed.success, true)

    // Title required
    const missingTitle = performanceCertificateSchema.safeParse({ title: '' })
    assert.strictEqual(missingTitle.success, false)
  })

  // -------------------------------------------------------------------------
  // 4. RBAC & Content Permissions
  // -------------------------------------------------------------------------
  test('RBAC correctly permits SUPER_ADMIN, ADMIN, and EDITOR to manage content', () => {
    assert.strictEqual(canManageContent('SUPER_ADMIN'), true)
    assert.strictEqual(canManageContent('ADMIN'), true)
    assert.strictEqual(canManageContent('EDITOR'), true)

    // Documents restricted to admins
    assert.strictEqual(canManageDocuments('SUPER_ADMIN'), true)
    assert.strictEqual(canManageDocuments('ADMIN'), true)
    assert.strictEqual(canManageDocuments('EDITOR'), false)

    // User management restricted to SUPER_ADMIN
    assert.strictEqual(canManageUsers('SUPER_ADMIN'), true)
    assert.strictEqual(canManageUsers('ADMIN'), false)
    assert.strictEqual(canManageUsers('EDITOR'), false)
  })
})
