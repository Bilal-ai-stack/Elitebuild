// GET/PUT /api/company
import { apiSuccess, apiUnauthorized, apiForbidden, handleApiError } from '@/lib/api/response'
import { companySchema } from '@/lib/validation'
import { getCompany, updateCompany, getPublicCompany } from '@/lib/services/company'
import { getApiSession } from '@/lib/auth/session'
import { createAuditLog } from '@/lib/services/audit'

export async function GET() {
  try {
    const session = await getApiSession()
    const data = session ? await getCompany() : await getPublicCompany()
    return apiSuccess(data)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getApiSession()
    if (!session) return apiUnauthorized()
    if (!['SUPER_ADMIN', 'ADMIN'].includes(session.role)) {
      return apiForbidden()
    }

    const body = await request.json()
    const validated = companySchema.parse(body)
    const company = await updateCompany(validated)

    await createAuditLog({
      userId: session.userId,
      action: 'Updated company information',
      entity: 'Company',
      entityId: company.id,
    })

    return apiSuccess(company)
  } catch (error) {
    return handleApiError(error)
  }
}
