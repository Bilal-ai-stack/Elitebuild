// POST /api/auth/logout
import { apiSuccess, handleApiError } from '@/lib/api/response'
import { destroySession } from '@/lib/auth/session'

export async function POST() {
  try {
    await destroySession()
    return apiSuccess({ message: 'Logged out successfully' })
  } catch (error) {
    return handleApiError(error)
  }
}
