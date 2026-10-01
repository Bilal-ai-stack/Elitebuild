// =============================================================================
// ELITEBUILD — Team Member [id] API Route
// GET    /api/team/[id]
// PUT    /api/team/[id]
// DELETE /api/team/[id]
// =============================================================================

import { apiSuccess, apiUnauthorized, apiForbidden, apiNotFound, handleApiError } from '@/lib/api/response'
import { teamMemberSchema } from '@/lib/validation'
import { getTeamMemberById, updateTeamMember, deleteTeamMember } from '@/lib/services/team'
import { getApiSession, canManageContent } from '@/lib/auth/session'
import { createAuditLog } from '@/lib/services/audit'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getApiSession()
    const { id } = await params
    const item = await getTeamMemberById(id)

    if (!item) return apiNotFound('Team member not found')

    // If unauthenticated public request, verify active status and sanitize private fields
    if (!session) {
      if (!item.active) return apiNotFound('Team member not found')
      return apiSuccess({
        id: item.id,
        name: item.name,
        title: item.title,
        department: item.department,
        bio: item.bio,
        photoUrl: item.photoUrl,
        displayOrder: item.displayOrder,
      })
    }

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
    const validated = teamMemberSchema.partial().parse(body)
    const item = await updateTeamMember(id, validated)

    await createAuditLog({
      userId: session.userId,
      action: 'Updated team member',
      entity: 'TeamMember',
      entityId: id,
      metadata: { name: item.name },
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
    const existing = await getTeamMemberById(id)
    if (!existing) return apiNotFound('Team member not found')

    await deleteTeamMember(id)

    await createAuditLog({
      userId: session.userId,
      action: 'Deleted team member',
      entity: 'TeamMember',
      entityId: id,
      metadata: { name: existing.name },
    })

    return apiSuccess({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
