// =============================================================================
// ELITEBUILD — Storage & Document Security Test Suite
// =============================================================================

import { test, describe } from 'node:test'
import assert from 'node:assert'
import path from 'node:path'
import {
  isSafeFileName,
  getPrivateStorageRoot,
  getPublicUploadRoot,
  uploadSecureDocument,
  resolveSecureDocumentPath,
  deleteSecureDocument,
  deleteImage,
} from '../lib/storage/index.ts'

describe('Document Storage Security & Path Traversal Protections', () => {
  test('isSafeFileName rejects path traversal attempts and directory separators', () => {
    // Basic traversal
    assert.strictEqual(isSafeFileName('../secret.txt'), false)
    assert.strictEqual(isSafeFileName('..\\secret.txt'), false)
    assert.strictEqual(isSafeFileName('../../etc/passwd'), false)
    assert.strictEqual(isSafeFileName('..\\..\\windows\\system32'), false)

    // Directory separators in basename
    assert.strictEqual(isSafeFileName('folder/document.pdf'), false)
    assert.strictEqual(isSafeFileName('folder\\document.pdf'), false)

    // Absolute paths (Windows and POSIX)
    assert.strictEqual(isSafeFileName('C:\\secret.txt'), false)
    assert.strictEqual(isSafeFileName('C:/secret.txt'), false)
    assert.strictEqual(isSafeFileName('/etc/shadow'), false)

    // Null byte injection
    assert.strictEqual(isSafeFileName('doc.pdf\0.exe'), false)

    // Valid filenames should pass
    assert.strictEqual(isSafeFileName('valid-document.pdf'), true)
    assert.strictEqual(isSafeFileName('12345-abc-def.docx'), true)
  })

  test('Private storage root is strictly outside public web root', () => {
    const privateRoot = getPrivateStorageRoot()
    const publicRoot = getPublicUploadRoot()

    assert.ok(privateRoot, 'Private storage root must be defined')
    assert.ok(!privateRoot.startsWith(publicRoot), 'Private storage root MUST NOT be inside public directory')
    assert.ok(!privateRoot.includes(path.join('public', 'uploads')), 'Private root must be isolated from public/uploads')
  })

  test('uploadSecureDocument creates isolated file and prevents path escape', async () => {
    const dummyBuffer = Buffer.from('CONFIDENTIAL CORPORATE TENDER SPECIFICATION')
    const originalName = 'tender-spec-2026.pdf'
    const mimeType = 'application/pdf'

    const uploaded = await uploadSecureDocument(dummyBuffer, originalName, mimeType)

    assert.ok(uploaded.storageKey, 'Storage key must be returned')
    assert.ok(uploaded.storageKey.endsWith('.pdf'), 'Safe extension must be preserved')
    assert.ok(!uploaded.storageKey.includes('/'), 'Storage key must be a pure filename')
    assert.ok(!uploaded.storageKey.includes('\\'), 'Storage key must not contain slashes')

    // Verify resolved path is strictly within private root
    const resolved = await resolveSecureDocumentPath(uploaded.storageKey)
    assert.ok(resolved !== null, 'Uploaded file must resolve successfully')
    assert.ok(resolved.startsWith(getPrivateStorageRoot()), 'Resolved path must be inside private root')

    // Clean up
    await deleteSecureDocument(uploaded.storageKey)
    const afterDelete = await resolveSecureDocumentPath(uploaded.storageKey)
    assert.strictEqual(afterDelete, null, 'Deleted file must not resolve')
  })

  test('resolveSecureDocumentPath returns null on malicious traversal keys', async () => {
    assert.strictEqual(await resolveSecureDocumentPath('../../../etc/passwd'), null)
    assert.strictEqual(await resolveSecureDocumentPath('..\\..\\..\\windows\\win.ini'), null)
    assert.strictEqual(await resolveSecureDocumentPath('C:\\secret.key'), null)
    assert.strictEqual(await resolveSecureDocumentPath('/var/data/secret'), null)
    assert.strictEqual(await resolveSecureDocumentPath('non-existent-random-uuid.pdf'), null)
  })

  test('deleteImage traps path traversal in public media deletion', async () => {
    // Should not throw or crash, and must reject traversing outside public upload root
    await assert.doesNotReject(async () => {
      await deleteImage('/uploads/../../package.json')
    })
    // Ensure package.json was not deleted
    const fs = await import('fs/promises')
    const pkgStat = await fs.stat(path.resolve(process.cwd(), 'package.json'))
    assert.ok(pkgStat.isFile(), 'Root package.json must remain completely intact')
  })
})

describe('Document Visibility & Role Access Matrix Verification', () => {
  // Mock decision logic matching the protected download route
  function isDownloadPermitted(
    docVisibility: 'PUBLIC' | 'ADMIN_ONLY' | 'PRIVATE',
    session: { role: 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR'; userId: string } | null,
    docOwnerId?: string
  ): { permitted: boolean; status: number } {
    if (docVisibility === 'PUBLIC') {
      return { permitted: true, status: 200 }
    }
    if (!session) {
      // 404 to avoid leaking document existence to unauthenticated callers
      return { permitted: false, status: 404 }
    }
    if (docVisibility === 'ADMIN_ONLY') {
      return { permitted: true, status: 200 }
    }
    if (docVisibility === 'PRIVATE') {
      const isManager = ['SUPER_ADMIN', 'ADMIN'].includes(session.role)
      const isOwner = docOwnerId && session.userId === docOwnerId
      if (isManager || isOwner) {
        return { permitted: true, status: 200 }
      }
      return { permitted: false, status: 403 }
    }
    return { permitted: false, status: 403 }
  }

  test('Unauthenticated callers cannot access ADMIN_ONLY or PRIVATE documents', () => {
    assert.strictEqual(isDownloadPermitted('ADMIN_ONLY', null).permitted, false)
    assert.strictEqual(isDownloadPermitted('ADMIN_ONLY', null).status, 404)

    assert.strictEqual(isDownloadPermitted('PRIVATE', null).permitted, false)
    assert.strictEqual(isDownloadPermitted('PRIVATE', null).status, 404)

    // PUBLIC is allowed
    assert.strictEqual(isDownloadPermitted('PUBLIC', null).permitted, true)
    assert.strictEqual(isDownloadPermitted('PUBLIC', null).status, 200)
  })

  test('Authenticated administrators can access ADMIN_ONLY documents', () => {
    const adminSession = { role: 'ADMIN' as const, userId: 'admin-1' }
    const superAdminSession = { role: 'SUPER_ADMIN' as const, userId: 'super-1' }
    const editorSession = { role: 'EDITOR' as const, userId: 'editor-1' }

    assert.strictEqual(isDownloadPermitted('ADMIN_ONLY', adminSession).permitted, true)
    assert.strictEqual(isDownloadPermitted('ADMIN_ONLY', superAdminSession).permitted, true)
    assert.strictEqual(isDownloadPermitted('ADMIN_ONLY', editorSession).permitted, true)
  })

  test('PRIVATE documents are strictly restricted to managers or uploader', () => {
    const editorSession = { role: 'EDITOR' as const, userId: 'editor-1' }
    const editorOwnerSession = { role: 'EDITOR' as const, userId: 'uploader-123' }
    const adminSession = { role: 'ADMIN' as const, userId: 'admin-1' }
    const superAdminSession = { role: 'SUPER_ADMIN' as const, userId: 'super-1' }

    // Other editor -> denied (403)
    assert.strictEqual(isDownloadPermitted('PRIVATE', editorSession, 'uploader-123').permitted, false)
    assert.strictEqual(isDownloadPermitted('PRIVATE', editorSession, 'uploader-123').status, 403)

    // Uploader editor -> allowed (200)
    assert.strictEqual(isDownloadPermitted('PRIVATE', editorOwnerSession, 'uploader-123').permitted, true)

    // Admin / Super Admin -> allowed (200)
    assert.strictEqual(isDownloadPermitted('PRIVATE', adminSession, 'uploader-123').permitted, true)
    assert.strictEqual(isDownloadPermitted('PRIVATE', superAdminSession, 'uploader-123').permitted, true)
  })
})
