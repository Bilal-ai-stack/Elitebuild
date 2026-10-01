// =============================================================================
// ELITEBUILD — Project Service
// =============================================================================

import prisma from '@/lib/db/prisma'
import type { ProjectInput, ProjectImageInput, PaginationInput } from '@/lib/validation'

// ---------------------------------------------------------------------------
// Public queries
// ---------------------------------------------------------------------------

export async function getPublicProjects(options?: {
  categorySlug?: string
  featured?: boolean
  limit?: number
}) {
  try {
    const where: Record<string, unknown> = { contentStatus: 'PUBLISHED' }
    if (options?.featured) where.featured = true
    if (options?.categorySlug) {
      where.category = { slug: options.categorySlug }
    }

    return await prisma.project.findMany({
      where,
      include: {
        category: { select: { name: true, slug: true } },
        images: {
          where: { featured: true },
          take: 1,
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
      ...(options?.limit ? { take: options.limit } : {}),
    })
  } catch (error) {
    console.error('getPublicProjects error:', error)
    return []
  }
}

export async function getPublicProjectBySlug(slug: string) {
  try {
    return await prisma.project.findFirst({
      where: { slug, contentStatus: 'PUBLISHED' },
      include: {
        category: { select: { name: true, slug: true } },
        images: { orderBy: { displayOrder: 'asc' } },
        certificates: {
          where: { active: true, verified: true },
          select: {
            id: true,
            title: true,
            issueDate: true,
            description: true,
            issuedBy: { select: { name: true, shortName: true } },
          },
          orderBy: { issueDate: 'desc' },
        },
      },
    })
  } catch (error) {
    console.error('getPublicProjectBySlug error:', error)
    return null
  }
}

export async function getPublicProjectByIdOrSlug(idOrSlug: string) {
  try {
    return await prisma.project.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        contentStatus: 'PUBLISHED',
      },
      include: {
        category: { select: { name: true, slug: true } },
        images: { orderBy: { displayOrder: 'asc' } },
        certificates: {
          where: { active: true, verified: true },
          select: {
            id: true,
            title: true,
            issueDate: true,
            description: true,
            issuedBy: { select: { name: true, shortName: true } },
          },
          orderBy: { issueDate: 'desc' },
        },
      },
    })
  } catch (error) {
    console.error('getPublicProjectByIdOrSlug error:', error)
    return null
  }
}

export async function getRelatedProjects(categoryId: string | null | undefined, excludeId: string, limit = 3) {
  try {
    return await prisma.project.findMany({
      where: {
        contentStatus: 'PUBLISHED',
        id: { not: excludeId },
        ...(categoryId ? { categoryId } : {}),
      },
      include: {
        category: { select: { name: true, slug: true } },
        images: {
          where: { featured: true },
          take: 1,
          orderBy: { displayOrder: 'asc' },
        },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    })
  } catch (error) {
    console.error('getRelatedProjects error:', error)
    return []
  }
}

// ---------------------------------------------------------------------------
// Admin queries
// ---------------------------------------------------------------------------

export async function getAdminProjects(pagination: PaginationInput & { status?: string; categoryId?: string }) {
  const { page, pageSize, search, sortBy, sortOrder, status, categoryId } = pagination
  const skip = (page - 1) * pageSize

  const where: Record<string, unknown> = {}
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { location: { contains: search, mode: 'insensitive' } },
      { clientOrganization: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (status) where.status = status
  if (categoryId) where.categoryId = categoryId

  const orderBy: Record<string, string> = {}
  orderBy[sortBy || 'createdAt'] = sortOrder

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      include: {
        category: { select: { name: true, slug: true } },
        _count: { select: { images: true } },
      },
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.project.count({ where }),
  ])

  return { projects, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

export async function getProjectById(id: string) {
  return prisma.project.findUnique({
    where: { id },
    include: {
      category: true,
      images: { orderBy: { displayOrder: 'asc' } },
    },
  })
}

export async function createProject(data: ProjectInput) {
  return prisma.project.create({ data })
}

export async function updateProject(id: string, data: Partial<ProjectInput>) {
  return prisma.project.update({ where: { id }, data })
}

export async function deleteProject(id: string) {
  return prisma.project.delete({ where: { id } })
}

// ---------------------------------------------------------------------------
// Project Images
// ---------------------------------------------------------------------------

export async function getProjectImages(projectId: string) {
  return prisma.projectImage.findMany({
    where: { projectId },
    orderBy: { displayOrder: 'asc' },
  })
}

export async function addProjectImage(data: ProjectImageInput) {
  return prisma.projectImage.create({ data })
}

export async function deleteProjectImage(id: string) {
  return prisma.projectImage.delete({ where: { id } })
}

export async function updateProjectImageOrder(id: string, displayOrder: number) {
  return prisma.projectImage.update({ where: { id }, data: { displayOrder } })
}

// ---------------------------------------------------------------------------
// Project Categories
// ---------------------------------------------------------------------------

export async function getProjectCategories() {
  return prisma.projectCategory.findMany({
    where: { active: true },
    orderBy: { displayOrder: 'asc' },
    include: { _count: { select: { projects: true } } },
  })
}

export async function getAllProjectCategories() {
  return prisma.projectCategory.findMany({
    orderBy: { displayOrder: 'asc' },
    include: { _count: { select: { projects: true } } },
  })
}
