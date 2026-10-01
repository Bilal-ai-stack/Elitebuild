// GET /api/audit-logs
import { apiSuccess, apiUnauthorized, apiForbidden, handleApiError } from '@/lib/api/response'
import { getAuditLogs } from '@/lib/services/audit'
import { getApiSession, canViewAuditLogs } from '@/lib/auth/session'
import { paginationSchema } from '@/lib/validation'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession()
    if (!session) return apiUnauthorized()
    if (!canViewAuditLogs(session.role)) return apiForbidden()

    const params = Object.fromEntries(request.nextUrl.searchParams)
    const pagination = paginationSchema.parse(params)
    const data = await getAuditLogs({
      ...pagination,
      entity: params.entity,
      userId: params.userId,
    })
    return apiSuccess(data)
  } catch (error) {
    return handleApiError(error)
  }
}
