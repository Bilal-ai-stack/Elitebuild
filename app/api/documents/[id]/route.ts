// GET/PUT/DELETE /api/documents/[id]
import { apiSuccess, apiUnauthorized, apiForbidden, apiNotFound, handleApiError } from '@/lib/api/response'
import { documentSchema } from '@/lib/validation'
import { updateDocument, deleteDocument } from '@/lib/services/content'
import { getApiSession, canManageDocuments } from '@/lib/auth/session'
import { createAuditLog } from '@/lib/services/audit'
import { deleteSecureDocument } from '@/lib/storage'
import prisma from '@/lib/db/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getApiSession()
    const { id } = await params
    const doc = await prisma.document.findUnique({ where: { id } })
    if (!doc) return apiNotFound('Document not found')

    // Public documents can be queried
    if (doc.visibility === 'PUBLIC') {
      return apiSuccess({
        id: doc.id,
        title: doc.title,
        description: doc.description,
        documentType: doc.documentType,
        mimeType: doc.mimeType,
        fileSize: doc.fileSize,
        visibility: doc.visibility,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        downloadUrl: `/api/documents/${doc.id}/download`,
      })
    }

    // Require session for non-public
    if (!session) return apiNotFound('Document not found')

    // Private documents require manager role or uploader ownership
    if (doc.visibility === 'PRIVATE' && !canManageDocuments(session.role) && session.userId !== doc.uploadedBy) {
      return apiForbidden()
    }

    return apiSuccess({
      id: doc.id,
      title: doc.title,
      description: doc.description,
      documentType: doc.documentType,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      visibility: doc.visibility,
      uploadedBy: doc.uploadedBy,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      downloadUrl: `/api/documents/${doc.id}/download`,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getApiSession()
    if (!session) return apiUnauthorized()
    if (!canManageDocuments(session.role)) return apiForbidden()

    const { id } = await params
    const body = await request.json()
    const validated = documentSchema.partial().omit({ fileUrl: true }).parse(body)
    const doc = await updateDocument(id, validated)

    await createAuditLog({
      userId: session.userId,
      action: 'Updated document',
      entity: 'Document',
      entityId: id,
      metadata: { title: doc.title, visibility: doc.visibility },
    })

    return apiSuccess({
      id: doc.id,
      title: doc.title,
      description: doc.description,
      documentType: doc.documentType,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      visibility: doc.visibility,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      downloadUrl: `/api/documents/${doc.id}/download`,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getApiSession()
    if (!session) return apiUnauthorized()
    if (!canManageDocuments(session.role)) return apiForbidden()

    const { id } = await params
    const doc = await prisma.document.findUnique({ where: { id } })
    if (!doc) return apiNotFound('Document not found')

    // Safely delete from private storage
    await deleteSecureDocument(doc.fileUrl).catch(() => {})
    await deleteDocument(id)

    await createAuditLog({
      userId: session.userId,
      action: 'Deleted document',
      entity: 'Document',
      entityId: id,
      metadata: { title: doc.title },
    })

    return apiSuccess({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
