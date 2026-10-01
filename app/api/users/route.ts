// GET/POST /api/users — admin user management (SUPER_ADMIN)
import { apiSuccess, apiCreated, apiUnauthorized, apiForbidden, handleApiError } from '@/lib/api/response'
import { createUserSchema } from '@/lib/validation'
import { getApiSession, canManageUsers, hashPassword } from '@/lib/auth/session'
import { createAuditLog } from '@/lib/services/audit'
import prisma from '@/lib/db/prisma'

export async function GET() {
  try {
    const session = await getApiSession()
    if (!session) return apiUnauthorized()
    if (!canManageUsers(session.role)) return apiForbidden()

    const users = await prisma.adminUser.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })
    return apiSuccess(users)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: Request) {
  try {
    const session = await getApiSession()
    if (!session) return apiUnauthorized()
    if (!canManageUsers(session.role)) return apiForbidden()

    const body = await request.json()
    const validated = createUserSchema.parse(body)
    const passwordHash = await hashPassword(validated.password)

    const user = await prisma.adminUser.create({
      data: {
        email: validated.email.toLowerCase(),
        name: validated.name,
        passwordHash,
        role: validated.role,
        active: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
      },
    })

    await createAuditLog({
      userId: session.userId,
      action: 'Created admin user',
      entity: 'AdminUser',
      entityId: user.id,
      metadata: { email: user.email, role: user.role },
    })

    return apiCreated(user)
  } catch (error) {
    return handleApiError(error)
  }
}
