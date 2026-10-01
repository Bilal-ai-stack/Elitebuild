// =============================================================================
// ELITEBUILD — Client Organization [id] API Route
// GET    /api/client-organizations/[id]
// PUT    /api/client-organizations/[id]
// DELETE /api/client-organizations/[id]
// =============================================================================

import {
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiConflict,
  handleApiError,
} from '@/lib/api/response'
import { clientOrganizationSchema } from '@/lib/validation'
import {
  getClientOrganizationById,
  updateClientOrganization,
  deleteClientOrganization,
} from '@/lib/services/client-organizations'
import { getApiSession, canManageContent } from '@/lib/auth/session'
import { createAuditLog } from '@/lib/services/audit'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getApiSession()
    const { id } = await params
    const item = await getClientOrganizationById(id)

    if (!item) return apiNotFound('Client organization not found')

    if (!session && !item.active) {
      return apiNotFound('Client organization not found')
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
    const validated = clientOrganizationSchema.partial().parse(body)
    const item = await updateClientOrganization(id, validated)

    await createAuditLog({
      userId: session.userId,
      action: 'Updated client organization',
      entity: 'ClientOrganization',
      entityId: id,
      metadata: { name: item.name },
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
    const existing = await getClientOrganizationById(id)
    if (!existing) return apiNotFound('Client organization not found')

    try {
      await deleteClientOrganization(id)
    } catch (err: any) {
      if (err.message === 'HAS_DEPENDENCIES') {
        return apiConflict(
          'Cannot delete this client organization because it has linked performance certificates or project references. Deactivate it instead to preserve project history.',
        )
      }
      throw err
    }

    await createAuditLog({
      userId: session.userId,
      action: 'Deleted client organization',
      entity: 'ClientOrganization',
      entityId: id,
      metadata: { name: existing.name },
    })

    return apiSuccess({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
