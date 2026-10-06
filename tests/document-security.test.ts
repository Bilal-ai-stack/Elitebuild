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

describe('Cloudflare R2 & S3 Secure Document Storage Unit Tests', () => {
  const mockConfig = {
    bucket: 'test-bucket',
    accessKeyId: 'test-access-key',
    secretAccessKey: 'test-secret-key',
    region: 'auto',
    endpoint: 'https://test-account.r2.cloudflarestorage.com',
  }

  test('S3StorageProvider checks configuration and generates correct R2 endpoint URLs', async () => {
    const { S3StorageProvider } = await import('../lib/storage/s3.ts')
    const provider = new S3StorageProvider(mockConfig)
    assert.strictEqual(provider.isConfigured(), true)

    const { host, url } = provider.getHostAndUrl('documents/test-uuid.pdf')
    assert.strictEqual(host, 'test-account.r2.cloudflarestorage.com')
    assert.strictEqual(url, 'https://test-account.r2.cloudflarestorage.com/test-bucket/documents/test-uuid.pdf')

    // Empty config returns false
    const unconfigured = new S3StorageProvider({ bucket: '', accessKeyId: '', secretAccessKey: '' })
    assert.strictEqual(unconfigured.isConfigured(), false)
  })

  test('signRequest produces valid AWS4-HMAC-SHA256 authorization headers', async () => {
    const { S3StorageProvider } = await import('../lib/storage/s3.ts')
    const provider = new S3StorageProvider(mockConfig)

    const signed = provider.signRequest('GET', 'documents/test-doc.pdf', '', {})
    assert.ok(signed.Authorization.startsWith('AWS4-HMAC-SHA256 Credential=test-access-key/'))
    assert.ok(signed.Authorization.includes('/auto/s3/aws4_request'))
    assert.ok(signed['x-amz-date'])
    assert.ok(signed['x-amz-content-sha256'])
  })

  test('streamSecureDocumentFromS3 returns null on directory traversal attempts', async () => {
    const { streamSecureDocumentFromS3 } = await import('../lib/storage/s3.ts')
    assert.strictEqual(await streamSecureDocumentFromS3('../../../etc/passwd', mockConfig), null)
    assert.strictEqual(await streamSecureDocumentFromS3('..\\..\\windows\\win.ini', mockConfig), null)
    assert.strictEqual(await streamSecureDocumentFromS3('folder/secret.pdf', mockConfig), null)
  })

  test('streamSecureDocumentFromS3 returns null when object is not found (404)', async () => {
    const { streamSecureDocumentFromS3 } = await import('../lib/storage/s3.ts')

    // Mock global fetch to return 404
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => new Response('Not Found', { status: 404 })

    try {
      const result = await streamSecureDocumentFromS3('nonexistent-uuid.pdf', mockConfig)
      assert.strictEqual(result, null)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('uploadSecureDocumentToS3 uploads to private documents/ prefix and never exposes public URL', async () => {
    const { uploadSecureDocumentToS3 } = await import('../lib/storage/s3.ts')

    let capturedUrl = ''
    let capturedMethod = ''
    const originalFetch = globalThis.fetch
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = url.toString()
      capturedMethod = init?.method || 'GET'
      return new Response('', { status: 200 })
    }) as typeof fetch

    try {
      const dummyBuffer = Buffer.from('CONFIDENTIAL TAX AUDIT CERTIFICATE')
      const result = await uploadSecureDocumentToS3(dummyBuffer, 'tax-audit-2026.pdf', 'application/pdf', mockConfig)

      assert.ok(result.storageKey.endsWith('.pdf'))
      assert.ok(!result.storageKey.includes('/'))
      assert.strictEqual(capturedMethod, 'PUT')
      assert.ok(capturedUrl.includes('/test-bucket/documents/'))
      assert.ok(capturedUrl.endsWith(result.storageKey))
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('Public media upload respects STORAGE_PUBLIC_URL_PREFIX and uses uploads/ prefix', async () => {
    const { S3StorageProvider } = await import('../lib/storage/s3.ts')
    const provider = new S3StorageProvider({
      ...mockConfig,
      publicUrlPrefix: 'https://cdn.eliteconstruction.pk',
    })

    const originalFetch = globalThis.fetch
    globalThis.fetch = (async () => new Response('', { status: 200 })) as typeof fetch

    try {
      const dummyImage = Buffer.from('JPEG DATA')
      const result = await provider.upload(dummyImage, 'site-photo.jpg', 'image/jpeg')

      assert.ok(result.url.startsWith('https://cdn.eliteconstruction.pk/uploads/images/'))
      assert.ok(result.url.endsWith('.jpg'))
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('getSecureDocumentStream resolves local file when STORAGE_PROVIDER is not s3', async () => {
    const { uploadSecureDocument, getSecureDocumentStream, deleteSecureDocument } = await import('../lib/storage/index.ts')

    const originalEnv = process.env.STORAGE_PROVIDER
    delete process.env.STORAGE_PROVIDER

    try {
      const buffer = Buffer.from('LOCAL STORAGE CONFIDENTIAL CONTENT')
      const uploaded = await uploadSecureDocument(buffer, 'local-test-doc.txt', 'text/plain')

      const streamResult = await getSecureDocumentStream(uploaded.storageKey)
      assert.ok(streamResult !== null, 'Stream must be resolved from local disk')
      assert.strictEqual(streamResult.size, buffer.length)

      // Clean up
      await deleteSecureDocument(uploaded.storageKey)
    } finally {
      if (originalEnv) process.env.STORAGE_PROVIDER = originalEnv
    }
  })
})
