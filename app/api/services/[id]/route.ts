// GET/PUT/DELETE /api/services/[id]
import { apiSuccess, apiUnauthorized, apiForbidden, apiNotFound, handleApiError } from '@/lib/api/response'
import { serviceSchema } from '@/lib/validation'
import { getServiceById, updateService, deleteService } from '@/lib/services/services'
import { getApiSession, canManageContent } from '@/lib/auth/session'
import { createAuditLog } from '@/lib/services/audit'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const service = await getServiceById(id)
    if (!service) return apiNotFound('Service not found')
    return apiSuccess(service)
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
    const validated = serviceSchema.partial().parse(body)
    const service = await updateService(id, validated)

    await createAuditLog({
      userId: session.userId,
      action: 'Updated service',
      entity: 'Service',
      entityId: id,
      metadata: { name: service.name },
    })

    return apiSuccess(service)
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
    await deleteService(id)

    await createAuditLog({
      userId: session.userId,
      action: 'Deleted service',
      entity: 'Service',
      entityId: id,
    })

    return apiSuccess({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
