// GET/PUT /api/settings — site settings (admin)
import { apiSuccess, apiUnauthorized, apiForbidden, handleApiError } from '@/lib/api/response'
import { getSiteSettings, setSiteSetting } from '@/lib/services/content'
import { getApiSession, canManageSettings } from '@/lib/auth/session'
import { createAuditLog } from '@/lib/services/audit'
import { z } from 'zod'

const settingsUpdateSchema = z.object({
  settings: z.record(z.string(), z.string().nullable()),
})

export async function GET() {
  try {
    const session = await getApiSession()
    if (!session) return apiUnauthorized()
    if (!canManageSettings(session.role)) return apiForbidden()

    const data = await getSiteSettings()
    return apiSuccess(data)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getApiSession()
    if (!session) return apiUnauthorized()
    if (!canManageSettings(session.role)) return apiForbidden()

    const body = await request.json()
    const { settings } = settingsUpdateSchema.parse(body)

    for (const [key, value] of Object.entries(settings)) {
      await setSiteSetting(key, value)
    }

    await createAuditLog({
      userId: session.userId,
      action: 'Updated site settings',
      entity: 'SiteSetting',
      metadata: { keys: Object.keys(settings) },
    })

    const data = await getSiteSettings()
    return apiSuccess(data)
  } catch (error) {
    return handleApiError(error)
  }
}
