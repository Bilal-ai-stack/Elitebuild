// GET/POST /api/services
import { apiSuccess, apiCreated, apiUnauthorized, apiForbidden, handleApiError } from '@/lib/api/response'
import { serviceSchema, paginationSchema } from '@/lib/validation'
import { getPublicServices, getAdminServices, createService } from '@/lib/services/services'
import { getApiSession, canManageContent } from '@/lib/auth/session'
import { createAuditLog } from '@/lib/services/audit'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession()

    if (session) {
      const params = Object.fromEntries(request.nextUrl.searchParams)
      const pagination = paginationSchema.parse(params)
      const data = await getAdminServices(pagination)
      return apiSuccess(data)
    }

    const data = await getPublicServices()
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
    const validated = serviceSchema.parse(body)
    const service = await createService(validated)

    await createAuditLog({
      userId: session.userId,
      action: 'Created service',
      entity: 'Service',
      entityId: service.id,
      metadata: { name: service.name },
    })

    return apiCreated(service)
  } catch (error) {
    return handleApiError(error)
  }
}
