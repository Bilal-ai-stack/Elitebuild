// GET/POST /api/credentials
import { apiSuccess, apiCreated, apiUnauthorized, apiForbidden, handleApiError } from '@/lib/api/response'
import { credentialSchema } from '@/lib/validation'
import { getPublicCredentials, getAdminCredentials, createCredential } from '@/lib/services/content'
import { getApiSession, canManageContent } from '@/lib/auth/session'
import { createAuditLog } from '@/lib/services/audit'

export async function GET() {
  try {
    const session = await getApiSession()
    const data = session ? await getAdminCredentials() : await getPublicCredentials()
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
    const validated = credentialSchema.parse(body)
    const item = await createCredential(validated)

    await createAuditLog({
      userId: session.userId,
      action: 'Created credential',
      entity: 'Credential',
      entityId: item.id,
      metadata: { title: item.title },
    })

    return apiCreated(item)
  } catch (error) {
    return handleApiError(error)
  }
}
