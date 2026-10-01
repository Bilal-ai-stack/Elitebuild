// =============================================================================
// ELITEBUILD — FAQ, Capability, Equipment, Credential, Document Services
// =============================================================================

import prisma from '@/lib/db/prisma'

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

export async function getPublicFAQs() {
  try {
    return await prisma.fAQ.findMany({
      where: { active: true, public: true },
      orderBy: { displayOrder: 'asc' },
    })
  } catch (error) {
    console.error('getPublicFAQs error:', error)
    return []
  }
}

export async function getAdminFAQs() {
  return prisma.fAQ.findMany({ orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }] })
}

export async function createFAQ(data: { question: string; answer: string; category?: string; displayOrder?: number; active?: boolean; public?: boolean }) {
  return prisma.fAQ.create({ data })
}

export async function updateFAQ(id: string, data: Partial<{ question: string; answer: string; category: string; displayOrder: number; active: boolean; public: boolean }>) {
  return prisma.fAQ.update({ where: { id }, data })
}

export async function deleteFAQ(id: string) {
  return prisma.fAQ.delete({ where: { id } })
}

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

export async function getPublicCapabilities() {
  try {
    return await prisma.capability.findMany({
      where: { active: true },
      orderBy: { displayOrder: 'asc' },
    })
  } catch (error) {
    console.error('getPublicCapabilities error:', error)
    return []
  }
}

export async function getAdminCapabilities() {
  return prisma.capability.findMany({ orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }] })
}

export async function createCapability(data: { title: string; description?: string; icon?: string; imageUrl?: string; displayOrder?: number; featured?: boolean; active?: boolean }) {
  return prisma.capability.create({ data })
}

export async function updateCapability(id: string, data: Partial<{ title: string; description: string; icon: string; imageUrl: string; displayOrder: number; featured: boolean; active: boolean }>) {
  return prisma.capability.update({ where: { id }, data })
}

export async function deleteCapability(id: string) {
  return prisma.capability.delete({ where: { id } })
}

// ---------------------------------------------------------------------------
// Equipment
// ---------------------------------------------------------------------------

export async function getPublicEquipment() {
  try {
    return await prisma.equipment.findMany({
      where: { active: true },
      orderBy: { displayOrder: 'asc' },
    })
  } catch (error) {
    console.error('getPublicEquipment error:', error)
    return []
  }
}

export async function getAdminEquipment() {
  return prisma.equipment.findMany({ orderBy: [{ category: 'asc' }, { displayOrder: 'asc' }] })
}

export async function createEquipment(data: { name: string; category?: string; description?: string; quantity?: number | null; imageUrl?: string; status?: string; displayOrder?: number; active?: boolean }) {
  return prisma.equipment.create({ data })
}

export async function updateEquipment(id: string, data: Partial<{ name: string; category: string; description: string; quantity: number | null; imageUrl: string; status: string; displayOrder: number; active: boolean }>) {
  return prisma.equipment.update({ where: { id }, data })
}

export async function deleteEquipment(id: string) {
  return prisma.equipment.delete({ where: { id } })
}

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------

export async function getPublicCredentials() {
  try {
    return await prisma.credential.findMany({
      where: { active: true, verified: true },
      select: {
        id: true,
        title: true,
        issuingOrganization: true,
        credentialNumber: true,
        issueDate: true,
        expiryDate: true,
        description: true,
        imageUrl: true,
        displayOrder: true,
        verified: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        // documentUrl is explicitly omitted from public exposure
      },
      orderBy: { displayOrder: 'asc' },
    })
  } catch (error) {
    console.error('getPublicCredentials error:', error)
    return []
  }
}

export async function getAdminCredentials() {
  return prisma.credential.findMany({ orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }] })
}

export async function createCredential(data: { title: string; issuingOrganization?: string; credentialNumber?: string; issueDate?: Date | null; expiryDate?: Date | null; description?: string; documentUrl?: string; imageUrl?: string; displayOrder?: number; verified?: boolean; active?: boolean }) {
  return prisma.credential.create({ data })
}

export async function updateCredential(id: string, data: Partial<{ title: string; issuingOrganization: string; credentialNumber: string; issueDate: Date | null; expiryDate: Date | null; description: string; documentUrl: string; imageUrl: string; displayOrder: number; verified: boolean; active: boolean }>) {
  return prisma.credential.update({ where: { id }, data })
}

export async function deleteCredential(id: string) {
  return prisma.credential.delete({ where: { id } })
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export async function getPublicDocuments() {
  return prisma.document.findMany({
    where: { visibility: 'PUBLIC' },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getAdminDocuments() {
  return prisma.document.findMany({
    where: { visibility: { not: 'PRIVATE' } },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createDocument(data: { title: string; description?: string; documentType?: any; fileUrl: string; mimeType?: string; fileSize?: number; visibility?: any; uploadedBy?: string }) {
  return prisma.document.create({ data })
}

export async function updateDocument(id: string, data: Partial<{ title: string; description: string; documentType: any; visibility: any }>) {
  return prisma.document.update({ where: { id }, data })
}

export async function deleteDocument(id: string) {
  return prisma.document.delete({ where: { id } })
}

// ---------------------------------------------------------------------------
// Site Settings
// ---------------------------------------------------------------------------

export async function getSiteSettings() {
  const settings = await prisma.siteSetting.findMany()
  return Object.fromEntries(settings.map((s: any) => [s.key, s.value]))
}

export async function getSiteSetting(key: string) {
  const setting = await prisma.siteSetting.findUnique({ where: { key } })
  return setting?.value ?? null
}

export async function setSiteSetting(key: string, value: string | null, group = 'general') {
  return prisma.siteSetting.upsert({
    where: { key },
    update: { value, group },
    create: { key, value, group },
  })
}

// ---------------------------------------------------------------------------
// Dashboard Stats
// ---------------------------------------------------------------------------

export async function getDashboardStats() {
  const [projects, services, inquiries, faqs, documents, equipment, credentials, images, team, clientOrgs, certificates] = await Promise.all([
    prisma.project.count(),
    prisma.service.count(),
    prisma.contactInquiry.count({ where: { status: 'NEW' } }),
    prisma.fAQ.count(),
    prisma.document.count(),
    prisma.equipment.count(),
    prisma.credential.count(),
    prisma.projectImage.count(),
    prisma.teamMember.count(),
    prisma.clientOrganization.count(),
    prisma.performanceCertificate.count(),
  ])

  return {
    projects,
    services,
    newInquiries: inquiries,
    faqs,
    documents,
    equipment,
    credentials,
    galleryImages: images,
    team,
    clientOrgs,
    certificates,
  }
}
