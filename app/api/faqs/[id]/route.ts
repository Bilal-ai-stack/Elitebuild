// GET/PUT/DELETE /api/faqs/[id]
import { apiSuccess, apiUnauthorized, apiForbidden, apiNotFound, handleApiError } from '@/lib/api/response'
import { faqSchema } from '@/lib/validation'
import { updateFAQ, deleteFAQ, getAdminFAQs } from '@/lib/services/content'
import { getApiSession, canManageContent } from '@/lib/auth/session'
import { createAuditLog } from '@/lib/services/audit'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const all = await getAdminFAQs()
    const faq = all.find((f: any) => f.id === id)
    if (!faq) return apiNotFound('FAQ not found')
    return apiSuccess(faq)
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
    const validated = faqSchema.partial().parse(body)
    const faq = await updateFAQ(id, validated)

    await createAuditLog({
      userId: session.userId,
      action: 'Updated FAQ',
      entity: 'FAQ',
      entityId: id,
    })

    return apiSuccess(faq)
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
    await deleteFAQ(id)

    await createAuditLog({
      userId: session.userId,
      action: 'Deleted FAQ',
      entity: 'FAQ',
      entityId: id,
    })

    return apiSuccess({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
