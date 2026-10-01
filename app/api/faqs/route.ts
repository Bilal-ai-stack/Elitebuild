// GET/POST /api/faqs
import { apiSuccess, apiCreated, apiUnauthorized, apiForbidden, handleApiError } from '@/lib/api/response'
import { faqSchema } from '@/lib/validation'
import { getPublicFAQs, getAdminFAQs, createFAQ } from '@/lib/services/content'
import { getApiSession, canManageContent } from '@/lib/auth/session'
import { createAuditLog } from '@/lib/services/audit'

export async function GET() {
  try {
    const session = await getApiSession()
    const data = session ? await getAdminFAQs() : await getPublicFAQs()
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
    const validated = faqSchema.parse(body)
    const faq = await createFAQ(validated)

    await createAuditLog({
      userId: session.userId,
      action: 'Created FAQ',
      entity: 'FAQ',
      entityId: faq.id,
    })

    return apiCreated(faq)
  } catch (error) {
    return handleApiError(error)
  }
}
