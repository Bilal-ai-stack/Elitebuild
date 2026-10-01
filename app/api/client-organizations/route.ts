// =============================================================================
// ELITEBUILD — Client Organizations API Route
// GET  /api/client-organizations — List client organizations
// POST /api/client-organizations — Create client organization
// =============================================================================

import { apiSuccess, apiCreated, apiUnauthorized, apiForbidden, handleApiError } from '@/lib/api/response'
import { clientOrganizationSchema } from '@/lib/validation'
import {
  getPublicClientOrganizations,
  getAdminClientOrganizations,
  createClientOrganization,
} from '@/lib/services/client-organizations'
import { getApiSession, canManageContent } from '@/lib/auth/session'
import { createAuditLog } from '@/lib/services/audit'

export async function GET() {
  try {
    const session = await getApiSession()
    const data = session ? await getAdminClientOrganizations() : await getPublicClientOrganizations()
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
    const validated = clientOrganizationSchema.parse(body)
    const item = await createClientOrganization(validated)

    await createAuditLog({
      userId: session.userId,
      action: 'Created client organization',
      entity: 'ClientOrganization',
      entityId: item.id,
      metadata: { name: item.name, shortName: item.shortName },
    })

    return apiCreated(item)
  } catch (error) {
    return handleApiError(error)
  }
}
