// POST /api/auth/login
import { apiSuccess, apiBadRequest, handleApiError, apiTooManyRequests } from '@/lib/api/response'
import { loginSchema } from '@/lib/validation'
import { verifyPassword, createSession } from '@/lib/auth/session'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { getClientIp } from '@/lib/security/sanitize'
import { createAuditLog } from '@/lib/services/audit'
import prisma from '@/lib/db/prisma'

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)
    const { allowed } = checkRateLimit(`auth:${ip}`, { windowMs: 300000, maxRequests: 10 })
    if (!allowed) return apiTooManyRequests('Too many login attempts. Please try again later.')

    const body = await request.json()
    const { email, password } = loginSchema.parse(body)

    const user = await prisma.adminUser.findUnique({ where: { email } })
    if (!user || !user.active) {
      return apiBadRequest('Invalid credentials')
    }

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      await createAuditLog({
        action: 'Failed login attempt',
        entity: 'AdminUser',
        metadata: { email },
        ipAddress: ip,
      })
      return apiBadRequest('Invalid credentials')
    }

    await createSession(user.id, user.email, user.name, user.role)

    await prisma.adminUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    await createAuditLog({
      userId: user.id,
      action: 'Logged in',
      entity: 'AdminUser',
      entityId: user.id,
      ipAddress: ip,
    })

    return apiSuccess({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
