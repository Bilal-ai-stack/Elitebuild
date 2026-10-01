// GET /api/projects/categories
import { apiSuccess, handleApiError } from '@/lib/api/response'
import { getProjectCategories, getAllProjectCategories } from '@/lib/services/projects'
import { getApiSession } from '@/lib/auth/session'

export async function GET() {
  try {
    const session = await getApiSession()
    const data = session ? await getAllProjectCategories() : await getProjectCategories()
    return apiSuccess(data)
  } catch (error) {
    return handleApiError(error)
  }
}
