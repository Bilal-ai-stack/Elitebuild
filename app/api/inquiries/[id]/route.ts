// PUT /api/inquiries/[id]
import { apiSuccess, apiUnauthorized, apiNotFound, handleApiError } from '@/lib/api/response'
import { inquiryUpdateSchema } from '@/lib/validation'
import { getInquiryById, updateInquiryStatus } from '@/lib/services/inquiries'
import { getApiSession } from '@/lib/auth/session'
import { createAuditLog } from '@/lib/services/audit'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getApiSession()
    if (!session) return apiUnauthorized()

    const { id } = await params
    const inquiry = await getInquiryById(id)
    if (!inquiry) return apiNotFound('Inquiry not found')
    return apiSuccess(inquiry)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getApiSession()
    if (!session) return apiUnauthorized()

    const { id } = await params
    const body = await request.json()
    const validated = inquiryUpdateSchema.parse(body)
    const inquiry = await updateInquiryStatus(id, validated.status, validated.notes)

    await createAuditLog({
      userId: session.userId,
      action: `Updated inquiry status to ${validated.status}`,
      entity: 'ContactInquiry',
      entityId: id,
    })

    return apiSuccess(inquiry)
  } catch (error) {
    return handleApiError(error)
  }
}
