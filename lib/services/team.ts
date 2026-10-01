// =============================================================================
// ELITEBUILD — Team Service
// =============================================================================

import prisma from '@/lib/db/prisma'
import type { TeamMemberInput } from '@/lib/validation'

// ---------------------------------------------------------------------------
// Public queries (returns only active, strips private/contact fields)
// ---------------------------------------------------------------------------

export async function getPublicTeamMembers() {
  try {
    return await prisma.teamMember.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        title: true,
        department: true,
        bio: true,
        photoUrl: true,
        displayOrder: true,
      },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    })
  } catch (error) {
    console.error('getPublicTeamMembers error:', error)
    return []
  }
}

// ---------------------------------------------------------------------------
// Admin queries
// ---------------------------------------------------------------------------

export async function getAdminTeamMembers() {
  return prisma.teamMember.findMany({
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
  })
}

export async function getTeamMemberById(id: string) {
  return prisma.teamMember.findUnique({
    where: { id },
  })
}

export async function createTeamMember(data: TeamMemberInput) {
  return prisma.teamMember.create({
    data: {
      name: data.name,
      title: data.title || null,
      department: data.department || null,
      bio: data.bio || null,
      photoUrl: data.photoUrl || null,
      email: data.email || null,
      phone: data.phone || null,
      displayOrder: data.displayOrder ?? 0,
      active: data.active ?? true,
    },
  })
}

export async function updateTeamMember(id: string, data: Partial<TeamMemberInput>) {
  return prisma.teamMember.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.title !== undefined ? { title: data.title || null } : {}),
      ...(data.department !== undefined ? { department: data.department || null } : {}),
      ...(data.bio !== undefined ? { bio: data.bio || null } : {}),
      ...(data.photoUrl !== undefined ? { photoUrl: data.photoUrl || null } : {}),
      ...(data.email !== undefined ? { email: data.email || null } : {}),
      ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
      ...(data.displayOrder !== undefined ? { displayOrder: data.displayOrder } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
    },
  })
}

export async function deleteTeamMember(id: string) {
  return prisma.teamMember.delete({
    where: { id },
  })
}
