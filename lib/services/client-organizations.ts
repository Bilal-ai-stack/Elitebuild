// =============================================================================
// ELITEBUILD — Client Organization Service
// =============================================================================

import prisma from '@/lib/db/prisma'
import type { ClientOrganizationInput } from '@/lib/validation'

// ---------------------------------------------------------------------------
// Public queries
// ---------------------------------------------------------------------------

export async function getPublicClientOrganizations() {
  try {
    return await prisma.clientOrganization.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        shortName: true,
        description: true,
        logoUrl: true,
        website: true,
        displayOrder: true,
      },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    })
  } catch (error) {
    console.error('getPublicClientOrganizations error:', error)
    return []
  }
}

// ---------------------------------------------------------------------------
// Admin queries
// ---------------------------------------------------------------------------

export async function getAdminClientOrganizations() {
  return prisma.clientOrganization.findMany({
    include: {
      _count: {
        select: { certificates: true },
      },
    },
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
  })
}

export async function getClientOrganizationById(id: string) {
  return prisma.clientOrganization.findUnique({
    where: { id },
    include: {
      certificates: {
        include: {
          project: { select: { id: true, title: true, slug: true } },
        },
      },
    },
  })
}

export async function createClientOrganization(data: ClientOrganizationInput) {
  return prisma.clientOrganization.create({
    data: {
      name: data.name,
      shortName: data.shortName || null,
      description: data.description || null,
      logoUrl: data.logoUrl || null,
      website: data.website || null,
      displayOrder: data.displayOrder ?? 0,
      active: data.active ?? true,
    },
  })
}

export async function updateClientOrganization(id: string, data: Partial<ClientOrganizationInput>) {
  return prisma.clientOrganization.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.shortName !== undefined ? { shortName: data.shortName || null } : {}),
      ...(data.description !== undefined ? { description: data.description || null } : {}),
      ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl || null } : {}),
      ...(data.website !== undefined ? { website: data.website || null } : {}),
      ...(data.displayOrder !== undefined ? { displayOrder: data.displayOrder } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
    },
  })
}

export async function deleteClientOrganization(id: string) {
  // Safety check: Prevent deletion if organization has linked certificates
  const org = await prisma.clientOrganization.findUnique({
    where: { id },
    include: {
      _count: {
        select: { certificates: true },
      },
    },
  })

  if (!org) {
    throw new Error('NOT_FOUND')
  }

  if (org._count.certificates > 0) {
    throw new Error('HAS_DEPENDENCIES')
  }

  // Also check if any project uses this organization name or short name
  const relatedProjects = await prisma.project.count({
    where: {
      OR: [
        { clientOrganization: org.name },
        ...(org.shortName ? [{ clientOrganization: org.shortName }] : []),
      ],
    },
  })

  if (relatedProjects > 0) {
    throw new Error('HAS_DEPENDENCIES')
  }

  return prisma.clientOrganization.delete({
    where: { id },
  })
}
