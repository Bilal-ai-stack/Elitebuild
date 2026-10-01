// =============================================================================
// ELITEBUILD — Performance Certificate Service
// =============================================================================

import prisma from '@/lib/db/prisma'
import type { PerformanceCertificateInput } from '@/lib/validation'

// ---------------------------------------------------------------------------
// Public queries (returns only verified and active certificates, omits raw private document paths)
// ---------------------------------------------------------------------------

export async function getPublicPerformanceCertificates() {
  try {
    return await prisma.performanceCertificate.findMany({
      where: { active: true, verified: true },
      select: {
        id: true,
        title: true,
        issueDate: true,
        description: true,
        imageUrl: true,
        verified: true,
        active: true,
        createdAt: true,
        project: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        issuedBy: {
          select: {
            id: true,
            name: true,
            shortName: true,
            logoUrl: true,
          },
        },
      },
      orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
    })
  } catch (error) {
    console.error('getPublicPerformanceCertificates error:', error)
    return []
  }
}

// ---------------------------------------------------------------------------
// Admin queries
// ---------------------------------------------------------------------------

export async function getAdminPerformanceCertificates() {
  return prisma.performanceCertificate.findMany({
    include: {
      project: {
        select: { id: true, title: true, slug: true },
      },
      issuedBy: {
        select: { id: true, name: true, shortName: true },
      },
    },
    orderBy: [{ createdAt: 'desc' }],
  })
}

export async function getPerformanceCertificateById(id: string) {
  return prisma.performanceCertificate.findUnique({
    where: { id },
    include: {
      project: true,
      issuedBy: true,
    },
  })
}

export async function createPerformanceCertificate(data: PerformanceCertificateInput) {
  return prisma.performanceCertificate.create({
    data: {
      title: data.title,
      projectId: data.projectId || null,
      issuedById: data.issuedById || null,
      issueDate: data.issueDate ? new Date(data.issueDate) : null,
      description: data.description || null,
      documentUrl: data.documentUrl || null,
      imageUrl: data.imageUrl || null,
      verified: data.verified ?? false,
      active: data.active ?? true,
    },
    include: {
      project: { select: { id: true, title: true } },
      issuedBy: { select: { id: true, name: true } },
    },
  })
}

export async function updatePerformanceCertificate(id: string, data: Partial<PerformanceCertificateInput>) {
  return prisma.performanceCertificate.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.projectId !== undefined ? { projectId: data.projectId || null } : {}),
      ...(data.issuedById !== undefined ? { issuedById: data.issuedById || null } : {}),
      ...(data.issueDate !== undefined ? { issueDate: data.issueDate ? new Date(data.issueDate) : null } : {}),
      ...(data.description !== undefined ? { description: data.description || null } : {}),
      ...(data.documentUrl !== undefined ? { documentUrl: data.documentUrl || null } : {}),
      ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl || null } : {}),
      ...(data.verified !== undefined ? { verified: data.verified } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
    },
    include: {
      project: { select: { id: true, title: true } },
      issuedBy: { select: { id: true, name: true } },
    },
  })
}

export async function deletePerformanceCertificate(id: string) {
  return prisma.performanceCertificate.delete({
    where: { id },
  })
}
