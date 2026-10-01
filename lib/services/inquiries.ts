// =============================================================================
// ELITEBUILD — Inquiry Service
// =============================================================================

import prisma from '@/lib/db/prisma'
import type { InquiryInput, PaginationInput } from '@/lib/validation'

export async function createInquiry(data: InquiryInput) {
  return prisma.contactInquiry.create({ data })
}

export async function getAdminInquiries(pagination: PaginationInput & { status?: string }) {
  const { page, pageSize, search, sortBy, sortOrder, status } = pagination
  const skip = (page - 1) * pageSize

  const where: Record<string, unknown> = {}
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { organization: { contains: search, mode: 'insensitive' } },
      { subject: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (status) where.status = status

  const orderBy: Record<string, string> = {}
  orderBy[sortBy || 'createdAt'] = sortOrder

  const [inquiries, total] = await Promise.all([
    prisma.contactInquiry.findMany({ where, orderBy, skip, take: pageSize }),
    prisma.contactInquiry.count({ where }),
  ])

  return { inquiries, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

export async function getInquiryById(id: string) {
  return prisma.contactInquiry.findUnique({ where: { id } })
}

export async function updateInquiryStatus(id: string, status: string, notes?: string) {
  return prisma.contactInquiry.update({
    where: { id },
    data: { status: status as any, ...(notes !== undefined ? { notes } : {}) },
  })
}

export async function deleteInquiry(id: string) {
  return prisma.contactInquiry.delete({ where: { id } })
}

export async function getInquiryStats() {
  const [total, newCount, inProgress, responded] = await Promise.all([
    prisma.contactInquiry.count(),
    prisma.contactInquiry.count({ where: { status: 'NEW' } }),
    prisma.contactInquiry.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.contactInquiry.count({ where: { status: 'RESPONDED' } }),
  ])
  return { total, new: newCount, inProgress, responded }
}
