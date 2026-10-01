// GET/POST /api/projects
import { apiSuccess, apiCreated, apiUnauthorized, apiForbidden, handleApiError } from '@/lib/api/response'
import { projectSchema, paginationSchema } from '@/lib/validation'
import { getPublicProjects, getAdminProjects, createProject } from '@/lib/services/projects'
import { getApiSession, canManageContent } from '@/lib/auth/session'
import { createAuditLog } from '@/lib/services/audit'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession()
    const searchParams = Object.fromEntries(request.nextUrl.searchParams)

    if (session) {
      const pagination = paginationSchema.parse(searchParams)
      const data = await getAdminProjects({
        ...pagination,
        status: searchParams.status,
        categoryId: searchParams.categoryId,
      })
      return apiSuccess(data)
    }

    const data = await getPublicProjects({
      categorySlug: searchParams.category,
      featured: searchParams.featured === 'true',
    })
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
    const validated = projectSchema.parse(body)
    const project = await createProject(validated)

    await createAuditLog({
      userId: session.userId,
      action: 'Created project',
      entity: 'Project',
      entityId: project.id,
      metadata: { title: project.title },
    })

    return apiCreated(project)
  } catch (error) {
    return handleApiError(error)
  }
}
