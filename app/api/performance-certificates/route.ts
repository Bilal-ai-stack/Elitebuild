// =============================================================================
// ELITEBUILD — Performance Certificates API Route
// GET  /api/performance-certificates — List performance certificates
// POST /api/performance-certificates — Create performance certificate
// =============================================================================

import { apiSuccess, apiCreated, apiUnauthorized, apiForbidden, handleApiError } from '@/lib/api/response'
import { performanceCertificateSchema } from '@/lib/validation'
import {
  getPublicPerformanceCertificates,
  getAdminPerformanceCertificates,
  createPerformanceCertificate,
} from '@/lib/services/performance-certificates'
import { getApiSession, canManageContent } from '@/lib/auth/session'
import { createAuditLog } from '@/lib/services/audit'

export async function GET() {
  try {
    const session = await getApiSession()
    const data = session ? await getAdminPerformanceCertificates() : await getPublicPerformanceCertificates()
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
    const validated = performanceCertificateSchema.parse(body)
    const item = await createPerformanceCertificate(validated)

    await createAuditLog({
      userId: session.userId,
      action: 'Created performance certificate',
      entity: 'PerformanceCertificate',
      entityId: item.id,
      metadata: { title: item.title, projectId: item.projectId, issuedById: item.issuedById },
    })

    return apiCreated(item)
  } catch (error) {
    return handleApiError(error)
  }
}
