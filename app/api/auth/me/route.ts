// GET /api/auth/me
import { apiSuccess, apiUnauthorized, handleApiError } from '@/lib/api/response'
import { getApiSession } from '@/lib/auth/session'

export async function GET() {
  try {
    const session = await getApiSession()
    if (!session) return apiUnauthorized()
    return apiSuccess({
      userId: session.userId,
      email: session.email,
      name: session.name,
      role: session.role,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
