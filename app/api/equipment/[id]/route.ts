// GET/PUT/DELETE /api/equipment/[id]
import { apiSuccess, apiUnauthorized, apiForbidden, apiNotFound, handleApiError } from '@/lib/api/response'
import { equipmentSchema } from '@/lib/validation'
import { updateEquipment, deleteEquipment, getAdminEquipment } from '@/lib/services/content'
import { getApiSession, canManageContent } from '@/lib/auth/session'
import { createAuditLog } from '@/lib/services/audit'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const all = await getAdminEquipment()
    const item = all.find((e: any) => e.id === id)
    if (!item) return apiNotFound('Equipment not found')
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
    const validated = equipmentSchema.partial().parse(body)
    const item = await updateEquipment(id, validated)

    await createAuditLog({
      userId: session.userId,
      action: 'Updated equipment',
      entity: 'Equipment',
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
    await deleteEquipment(id)

    await createAuditLog({
      userId: session.userId,
      action: 'Deleted equipment',
      entity: 'Equipment',
      entityId: id,
    })

    return apiSuccess({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
