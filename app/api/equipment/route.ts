// GET/POST /api/equipment
import { apiSuccess, apiCreated, apiUnauthorized, apiForbidden, handleApiError } from '@/lib/api/response'
import { equipmentSchema } from '@/lib/validation'
import { getPublicEquipment, getAdminEquipment, createEquipment } from '@/lib/services/content'
import { getApiSession, canManageContent } from '@/lib/auth/session'
import { createAuditLog } from '@/lib/services/audit'

export async function GET() {
  try {
    const session = await getApiSession()
    const data = session ? await getAdminEquipment() : await getPublicEquipment()
    return apiSuccess(data)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: Request) {
  try {
    const session = await getApiSession()
    if (!session) return apiUnauthorized()
    if (!canManageContent(session.role)) return apiForbidden()

    const body = await request.json()
    const validated = equipmentSchema.parse(body)
    const item = await createEquipment(validated)

    await createAuditLog({
      userId: session.userId,
      action: 'Created equipment',
      entity: 'Equipment',
      entityId: item.id,
      metadata: { name: item.name },
    })

    return apiCreated(item)
  } catch (error) {
    return handleApiError(error)
  }
}
