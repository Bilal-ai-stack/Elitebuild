// =============================================================================
// ELITEBUILD — Performance Certificate [id] API Route
// GET    /api/performance-certificates/[id]
// PUT    /api/performance-certificates/[id]
// DELETE /api/performance-certificates/[id]
// =============================================================================

import {
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  handleApiError,
} from '@/lib/api/response'
import { performanceCertificateSchema } from '@/lib/validation'
import {
  getPerformanceCertificateById,
  updatePerformanceCertificate,
  deletePerformanceCertificate,
} from '@/lib/services/performance-certificates'
import { getApiSession, canManageContent } from '@/lib/auth/session'
import { createAuditLog } from '@/lib/services/audit'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getApiSession()
    const { id } = await params
    const item = await getPerformanceCertificateById(id)

    if (!item) return apiNotFound('Performance certificate not found')

    // If unauthenticated public request, verify active + verified status and strip sensitive fields
    if (!session) {
      if (!item.active || !item.verified) return apiNotFound('Performance certificate not found')
      return apiSuccess({
        id: item.id,
        title: item.title,
        issueDate: item.issueDate,
        description: item.description,
        imageUrl: item.imageUrl,
        verified: item.verified,
        project: item.project ? { id: item.project.id, title: item.project.title, slug: item.project.slug } : null,
        issuedBy: item.issuedBy ? { id: item.issuedBy.id, name: item.issuedBy.name, shortName: item.issuedBy.shortName } : null,
      })
    }

    return apiSuccess(item)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getApiSession()
    if (!session) return apiUnauthorized()
    if (!canManageContent(session.role)) return apiForbidden()

    const { id } = await params
    const body = await request.json()
    const validated = performanceCertificateSchema.partial().parse(body)
    const item = await updatePerformanceCertificate(id, validated)

    await createAuditLog({
      userId: session.userId,
      action: 'Updated performance certificate',
      entity: 'PerformanceCertificate',
      entityId: id,
      metadata: { title: item.title },
    })

    return apiSuccess(item)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getApiSession()
    if (!session) return apiUnauthorized()
    if (!canManageContent(session.role)) return apiForbidden()

    const { id } = await params
    const existing = await getPerformanceCertificateById(id)
    if (!existing) return apiNotFound('Performance certificate not found')

    await deletePerformanceCertificate(id)

    await createAuditLog({
      userId: session.userId,
      action: 'Deleted performance certificate',
      entity: 'PerformanceCertificate',
      entityId: id,
      metadata: { title: existing.title },
    })

    return apiSuccess({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
