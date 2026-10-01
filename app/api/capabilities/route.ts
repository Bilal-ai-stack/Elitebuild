// GET/POST /api/capabilities — PUT/DELETE via /api/capabilities/[id]
import { apiSuccess, apiCreated, apiUnauthorized, apiForbidden, handleApiError } from '@/lib/api/response'
import { capabilitySchema } from '@/lib/validation'
import { getPublicCapabilities, getAdminCapabilities, createCapability } from '@/lib/services/content'
import { getApiSession, canManageContent } from '@/lib/auth/session'
import { createAuditLog } from '@/lib/services/audit'

export async function GET() {
  try {
    const session = await getApiSession()
    const data = session ? await getAdminCapabilities() : await getPublicCapabilities()
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
    const validated = capabilitySchema.parse(body)
    const item = await createCapability(validated)

    await createAuditLog({
      userId: session.userId,
      action: 'Created capability',
      entity: 'Capability',
      entityId: item.id,
      metadata: { title: item.title },
    })

    return apiCreated(item)
  } catch (error) {
    return handleApiError(error)
  }
}
