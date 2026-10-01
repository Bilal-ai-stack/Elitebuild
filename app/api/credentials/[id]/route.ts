// GET/PUT/DELETE /api/credentials/[id]
import { apiSuccess, apiUnauthorized, apiForbidden, apiNotFound, handleApiError } from '@/lib/api/response'
import { credentialSchema } from '@/lib/validation'
import { updateCredential, deleteCredential, getAdminCredentials } from '@/lib/services/content'
import { getApiSession, canManageContent } from '@/lib/auth/session'
import { createAuditLog } from '@/lib/services/audit'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getApiSession()
    const { id } = await params
    const all = session ? await getAdminCredentials() : (await getAdminCredentials()).filter((c: any) => c.active && c.verified)
    const item = all.find((c: any) => c.id === id)
    if (!item) return apiNotFound('Credential not found')
    if (!session && (!item.active || !item.verified)) return apiNotFound('Credential not found')
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
    const validated = credentialSchema.partial().parse(body)
    const item = await updateCredential(id, validated)

    await createAuditLog({
      userId: session.userId,
      action: 'Updated credential',
      entity: 'Credential',
      entityId: id,
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
    await deleteCredential(id)

    await createAuditLog({
      userId: session.userId,
      action: 'Deleted credential',
      entity: 'Credential',
      entityId: id,
    })

    return apiSuccess({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
