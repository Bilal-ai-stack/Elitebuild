// =============================================================================
// ELITEBUILD — Team API Route
// GET  /api/team — List team members (public: active only, safe fields; admin: all)
// POST /api/team — Create team member (admin/editor)
// =============================================================================

import { apiSuccess, apiCreated, apiUnauthorized, apiForbidden, handleApiError } from '@/lib/api/response'
import { teamMemberSchema } from '@/lib/validation'
import { getPublicTeamMembers, getAdminTeamMembers, createTeamMember } from '@/lib/services/team'
import { getApiSession, canManageContent } from '@/lib/auth/session'
import { createAuditLog } from '@/lib/services/audit'

export async function GET() {
  try {
    const session = await getApiSession()
    const data = session ? await getAdminTeamMembers() : await getPublicTeamMembers()
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
    const validated = teamMemberSchema.parse(body)
    const item = await createTeamMember(validated)

    await createAuditLog({
      userId: session.userId,
      action: 'Created team member',
      entity: 'TeamMember',
      entityId: item.id,
      metadata: { name: item.name, title: item.title, department: item.department },
    })

    return apiCreated(item)
  } catch (error) {
    return handleApiError(error)
  }
}
