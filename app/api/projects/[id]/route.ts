// GET/PUT/DELETE /api/projects/[id]
import { apiSuccess, apiUnauthorized, apiForbidden, apiNotFound, handleApiError } from '@/lib/api/response'
import { projectSchema } from '@/lib/validation'
import { getProjectById, updateProject, deleteProject } from '@/lib/services/projects'
import { getApiSession, canManageContent } from '@/lib/auth/session'
import { createAuditLog } from '@/lib/services/audit'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getApiSession()
    const project = await getProjectById(id)
    if (!project) return apiNotFound('Project not found')

    // Draft/archived projects are admin-only
    if (project.contentStatus !== 'PUBLISHED' && !session) {
      return apiNotFound('Project not found')
    }

    return apiSuccess(project)
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
    const validated = projectSchema.partial().parse(body)
    const project = await updateProject(id, validated)

    await createAuditLog({
      userId: session.userId,
      action: 'Updated project',
      entity: 'Project',
      entityId: id,
      metadata: { title: project.title },
    })

    return apiSuccess(project)
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
    await deleteProject(id)

    await createAuditLog({
      userId: session.userId,
      action: 'Deleted project',
      entity: 'Project',
      entityId: id,
    })

    return apiSuccess({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
