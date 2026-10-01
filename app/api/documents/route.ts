// GET/POST /api/documents
import { apiSuccess, apiCreated, apiUnauthorized, apiForbidden, handleApiError, apiBadRequest } from '@/lib/api/response'
import { documentSchema } from '@/lib/validation'
import { getPublicDocuments, getAdminDocuments, createDocument } from '@/lib/services/content'
import { getApiSession, canManageDocuments } from '@/lib/auth/session'
import { createAuditLog } from '@/lib/services/audit'
import { uploadSecureDocument } from '@/lib/storage'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getApiSession()
    const rawData = session ? await getAdminDocuments() : await getPublicDocuments()
    
    // Sanitize response to omit internal storage keys and provide download URLs
    const data = rawData.map((d) => ({
      id: d.id,
      title: d.title,
      description: d.description,
      documentType: d.documentType,
      mimeType: d.mimeType,
      fileSize: d.fileSize,
      visibility: d.visibility,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      downloadUrl: `/api/documents/${d.id}/download`,
    }))

    return apiSuccess(data)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: Request) {
  try {
    const session = await getApiSession()
    if (!session) return apiUnauthorized()
    if (!canManageDocuments(session.role)) return apiForbidden()

    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      if (!file) return apiBadRequest('No file provided')

      const allowed = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
      ]
      if (!allowed.includes(file.type)) {
        return apiBadRequest('Invalid file type. Allowed: PDF, Word, Excel, Images, Text')
      }
      if (file.size > 20 * 1024 * 1024) {
        return apiBadRequest('File too large. Maximum size: 20MB')
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      // Store in isolated private storage outside public web root
      const uploaded = await uploadSecureDocument(buffer, file.name, file.type)

      const title = (formData.get('title') as string) || file.name
      const description = (formData.get('description') as string) || undefined
      const documentType = (formData.get('documentType') as string) || 'OTHER'
      const visibility = (formData.get('visibility') as string) || 'ADMIN_ONLY'

      const validated = documentSchema.parse({
        title,
        description,
        documentType,
        fileUrl: uploaded.storageKey,
        mimeType: uploaded.mimeType,
        fileSize: uploaded.fileSize,
        visibility,
      })

      const doc = await createDocument({
        ...validated,
        uploadedBy: session.userId,
      })

      await createAuditLog({
        userId: session.userId,
        action: 'Uploaded secure document',
        entity: 'Document',
        entityId: doc.id,
        metadata: { title: doc.title, visibility: doc.visibility, mimeType: doc.mimeType },
      })

      return apiCreated({
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

    const body = await request.json()
    const validated = documentSchema.parse(body)
    const doc = await createDocument({ ...validated, uploadedBy: session.userId })

    await createAuditLog({
      userId: session.userId,
      action: 'Created document metadata',
      entity: 'Document',
      entityId: doc.id,
      metadata: { title: doc.title, visibility: doc.visibility },
    })

    return apiCreated({
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
