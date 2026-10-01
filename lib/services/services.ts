// =============================================================================
// ELITEBUILD — Service Service (Services management)
// =============================================================================

import prisma from '@/lib/db/prisma'
import type { ServiceInput, PaginationInput } from '@/lib/validation'

export async function getPublicServices() {
  try {
    return await prisma.service.findMany({
      where: { active: true },
      include: { category: { select: { name: true, slug: true } } },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    })
  } catch (error) {
    console.error('getPublicServices error:', error)
    return []
  }
}

export async function getPublicServiceBySlug(slug: string) {
  try {
    return await prisma.service.findFirst({
      where: { slug, active: true },
      include: { category: { select: { name: true, slug: true } } },
    })
  } catch (error) {
    console.error('getPublicServiceBySlug error:', error)
    return null
  }
}

export async function getRelatedServices(categoryId: string | null | undefined, excludeId: string, limit = 3) {
  try {
    return await prisma.service.findMany({
      where: {
        active: true,
        id: { not: excludeId },
        ...(categoryId ? { categoryId } : {}),
      },
      include: { category: { select: { name: true, slug: true } } },
      take: limit,
      orderBy: { displayOrder: 'asc' },
    })
  } catch (error) {
    console.error('getRelatedServices error:', error)
    return []
  }
}

export async function getAdminServices(pagination: PaginationInput) {
  const { page, pageSize, search, sortBy, sortOrder } = pagination
  const skip = (page - 1) * pageSize

  const where: Record<string, unknown> = {}
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { shortDescription: { contains: search, mode: 'insensitive' } },
    ]
  }

  const orderBy: Record<string, string> = {}
  orderBy[sortBy || 'displayOrder'] = sortOrder || 'asc'

  const [services, total] = await Promise.all([
    prisma.service.findMany({
      where,
      include: { category: { select: { name: true } } },
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.service.count({ where }),
  ])

  return { services, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

export async function getServiceById(id: string) {
  return prisma.service.findUnique({
    where: { id },
    include: { category: true },
  })
}

export async function createService(data: ServiceInput) {
  return prisma.service.create({ data })
}

export async function updateService(id: string, data: Partial<ServiceInput>) {
  return prisma.service.update({ where: { id }, data })
}

export async function deleteService(id: string) {
  return prisma.service.delete({ where: { id } })
}

// Service Categories
export async function getServiceCategories() {
  return prisma.serviceCategory.findMany({
    where: { active: true },
    orderBy: { displayOrder: 'asc' },
  })
}
