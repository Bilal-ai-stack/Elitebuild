// PUT/DELETE /api/users/[id]
import { apiSuccess, apiUnauthorized, apiForbidden, apiNotFound, apiBadRequest, handleApiError } from '@/lib/api/response'
import { getApiSession, canManageUsers, hashPassword } from '@/lib/auth/session'
import { createAuditLog } from '@/lib/services/audit'
import prisma from '@/lib/db/prisma'
import { z } from 'zod'

const updateUserSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'EDITOR']).optional(),
  active: z.boolean().optional(),
  password: z.string().min(8).max(128).optional(),
})

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getApiSession()
    if (!session) return apiUnauthorized()
    if (!canManageUsers(session.role)) return apiForbidden()

    const { id } = await params
    const existing = await prisma.adminUser.findUnique({ where: { id } })
    if (!existing) return apiNotFound('User not found')

    const body = await request.json()
    const validated = updateUserSchema.parse(body)

    const data: Record<string, unknown> = {}
    if (validated.name !== undefined) data.name = validated.name
    if (validated.role !== undefined) data.role = validated.role
    if (validated.active !== undefined) data.active = validated.active
    if (validated.password) data.passwordHash = await hashPassword(validated.password)

    const user = await prisma.adminUser.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        updatedAt: true,
      },
    })

    await createAuditLog({
      userId: session.userId,
      action: 'Updated admin user',
      entity: 'AdminUser',
      entityId: id,
      metadata: { fields: Object.keys(validated) },
    })

    return apiSuccess(user)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getApiSession()
    if (!session) return apiUnauthorized()
    if (!canManageUsers(session.role)) return apiForbidden()

    const { id } = await params
    if (id === session.userId) return apiBadRequest('Cannot delete your own account')

    const existing = await prisma.adminUser.findUnique({ where: { id } })
    if (!existing) return apiNotFound('User not found')

    await prisma.adminUser.delete({ where: { id } })

    await createAuditLog({
      userId: session.userId,
      action: 'Deleted admin user',
      entity: 'AdminUser',
      entityId: id,
      metadata: { email: existing.email },
    })

    return apiSuccess({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
