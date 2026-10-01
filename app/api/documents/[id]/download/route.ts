// =============================================================================
// GET /api/documents/[id]/download
// =============================================================================
// Secure, authorized document streaming endpoint.
// Enforces:
// 1. Session authentication and role-based authorization
// 2. Strict path traversal prevention
// 3. Streaming delivery (no large in-memory buffers)
// 4. Safe Content-Disposition and MIME headers
// 5. Zero exposure of internal server filesystem paths
// =============================================================================

import fs from 'fs'
import { stat } from 'fs/promises'
import { Readable } from 'stream'
import path from 'path'
import prisma from '@/lib/db/prisma'
import { getApiSession, canManageDocuments } from '@/lib/auth/session'
import { resolveSecureDocumentPath } from '@/lib/storage'
import { createAuditLog } from '@/lib/services/audit'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id || typeof id !== 'string') {
      return new Response(JSON.stringify({ error: { message: 'Invalid document identifier' } }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 1. Fetch document record
    const doc = await prisma.document.findUnique({
      where: { id },
    })

    if (!doc) {
      return new Response(JSON.stringify({ error: { message: 'Document not found' } }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 2. Authorization check
    const session = await getApiSession()

    if (doc.visibility === 'PUBLIC') {
      // Allowed for public or authenticated callers
    } else if (doc.visibility === 'ADMIN_ONLY') {
      if (!session) {
        // Return 404 to avoid leaking existence of admin documents to anonymous callers
        return new Response(JSON.stringify({ error: { message: 'Document not found' } }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      // Any authenticated admin role (SUPER_ADMIN, ADMIN, EDITOR)
    } else if (doc.visibility === 'PRIVATE') {
      if (!session) {
        return new Response(JSON.stringify({ error: { message: 'Document not found' } }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      const isManager = canManageDocuments(session.role)
      const isOwner = doc.uploadedBy && doc.uploadedBy === session.userId
      if (!isManager && !isOwner) {
        return new Response(JSON.stringify({ error: { message: 'Access denied to private document' } }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    // 3. Resolve secure physical file path
    const filePath = await resolveSecureDocumentPath(doc.fileUrl)
    if (!filePath) {
      return new Response(JSON.stringify({ error: { message: 'Document file not found on storage' } }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 4. File metadata and sanity check
    const fileStat = await stat(filePath)
    if (!fileStat.isFile()) {
      return new Response(JSON.stringify({ error: { message: 'Requested path is not a file' } }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 5. Audit log download event for authenticated sessions
    if (session) {
      createAuditLog({
        userId: session.userId,
        action: 'Downloaded document',
        entity: 'Document',
        entityId: doc.id,
        metadata: {
          title: doc.title,
          visibility: doc.visibility,
          fileSize: fileStat.size,
        },
      }).catch(() => {})
    }

    // 6. Safe filename for download header
    const fileExt = path.extname(filePath) || ''
    const sanitizedTitle = doc.title
      .replace(/[^a-zA-Z0-9_\-\. ]/g, '_')
      .trim()
      .slice(0, 80)
    const downloadFileName = sanitizedTitle.endsWith(fileExt)
      ? sanitizedTitle
      : `${sanitizedTitle}${fileExt}`

    // 7. Stream file
    const nodeStream = fs.createReadStream(filePath)
    const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>

    const mimeType = doc.mimeType || 'application/octet-stream'

    return new Response(webStream, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': fileStat.size.toString(),
        'Content-Disposition': `attachment; filename="${downloadFileName}"; filename*=UTF-8''${encodeURIComponent(downloadFileName)}`,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('Document download failure:', error)
    return new Response(JSON.stringify({ error: { message: 'An unexpected error occurred while retrieving the document' } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
