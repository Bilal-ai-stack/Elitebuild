// POST /api/inquiries (public) — GET /api/inquiries (admin)
import { apiSuccess, apiCreated, apiUnauthorized, handleApiError, apiTooManyRequests } from '@/lib/api/response'
import { inquirySchema, paginationSchema } from '@/lib/validation'
import { createInquiry, getAdminInquiries } from '@/lib/services/inquiries'
import { getApiSession } from '@/lib/auth/session'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { getClientIp, sanitize } from '@/lib/security/sanitize'
import { sendInquiryNotification } from '@/lib/services/email'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession()
    if (!session) return apiUnauthorized()

    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const pagination = paginationSchema.parse(searchParams)
    const data = await getAdminInquiries({
      ...pagination,
      status: searchParams.status,
    })
    return apiSuccess(data)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: Request) {
  try {
    // Rate limit by IP
    const ip = getClientIp(request)
    const { allowed } = checkRateLimit(`inquiry:${ip}`, { windowMs: 60000, maxRequests: 5 })
    if (!allowed) return apiTooManyRequests()

    const body = await request.json()
    const validated = inquirySchema.parse(body)

    const inquiry = await createInquiry({
      ...validated,
      name: sanitize(validated.name),
      organization: validated.organization ? sanitize(validated.organization) : undefined,
      subject: validated.subject ? sanitize(validated.subject) : undefined,
      message: sanitize(validated.message),
      projectType: validated.projectType ? sanitize(validated.projectType) : undefined,
    })

    // Best-effort email notification
    await sendInquiryNotification(validated).catch(() => {})

    return apiCreated({ id: inquiry.id, message: 'Thank you for your inquiry. We will be in touch.' })
  } catch (error) {
    return handleApiError(error)
  }
}
