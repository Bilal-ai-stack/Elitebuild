// =============================================================================
// ELITEBUILD — Audit Logging Service
// =============================================================================

import prisma from '@/lib/db/prisma'

export interface AuditEntry {
  userId?: string
  action: string
  entity: string
  entityId?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
}

export async function createAuditLog(entry: AuditEntry) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        metadata: (entry.metadata as any) ?? undefined,
        ipAddress: entry.ipAddress,
      },
    })
  } catch (error) {
    // Audit logging should never crash the main operation
    console.error('[Audit] Failed to create audit log:', error)
  }
}

export async function getAuditLogs(options: {
  page?: number
  pageSize?: number
  entity?: string
  userId?: string
}) {
  const page = options.page ?? 1
  const pageSize = options.pageSize ?? 50
  const skip = (page - 1) * pageSize

  const where: Record<string, unknown> = {}
  if (options.entity) where.entity = options.entity
  if (options.userId) where.userId = options.userId

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ])

  return { logs, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}
