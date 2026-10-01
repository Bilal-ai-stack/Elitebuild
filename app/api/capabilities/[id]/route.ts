// GET/PUT/DELETE /api/capabilities/[id]
import { apiSuccess, apiUnauthorized, apiForbidden, apiNotFound, handleApiError } from '@/lib/api/response'
import { capabilitySchema } from '@/lib/validation'
import { updateCapability, deleteCapability, getAdminCapabilities } from '@/lib/services/content'
import { getApiSession, canManageContent } from '@/lib/auth/session'
import { createAuditLog } from '@/lib/services/audit'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const all = await getAdminCapabilities()
    const item = all.find((c: any) => c.id === id)
    if (!item) return apiNotFound('Capability not found')
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
    const validated = capabilitySchema.partial().parse(body)
    const item = await updateCapability(id, validated)

    await createAuditLog({
      userId: session.userId,
      action: 'Updated capability',
      entity: 'Capability',
      entityId: id,
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
    await deleteCapability(id)

    await createAuditLog({
      userId: session.userId,
      action: 'Deleted capability',
      entity: 'Capability',
      entityId: id,
    })

    return apiSuccess({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
