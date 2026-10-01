// =============================================================================
// ELITEBUILD — Company Service
// =============================================================================

import prisma from '@/lib/db/prisma'
import type { CompanyInput } from '@/lib/validation'

export async function getCompany() {
  try {
    let company = await prisma.company.findFirst()
    if (!company) {
      try {
        company = await prisma.company.create({ data: {} })
      } catch {
        // Ignore create failure if database is read-only or during build
      }
    }
    return company
  } catch (error) {
    console.error('Error fetching company:', error)
    return null
  }
}

export async function updateCompany(data: CompanyInput) {
  const existing = await getCompany()
  if (!existing) {
    throw new Error('Company record not found')
  }
  return prisma.company.update({
    where: { id: existing.id },
    data,
  })
}

// ---------------------------------------------------------------------------
// Public-safe company data (strips internal fields)
// ---------------------------------------------------------------------------

export async function getPublicCompany() {
  try {
    const company = await getCompany()
    if (!company) {
      return {
        legalName: 'M/S ELITE CONSTRUCTION COMPANY',
        displayName: 'ELITE CONSTRUCTION COMPANY',
        tagline: 'Engineers & Constructors',
        description:
          'An established engineering and construction organization established in 2006 with documented experience across infrastructure, buildings, rehabilitation, maintenance, and associated works.',
        establishedYear: 2006,
        logoUrl: null,
        coverImageUrl: null,
        aboutText:
          'ELITE CONSTRUCTION COMPANY was established in 2006 in Peshawar. The company profile documents work across roads, bridges, buildings, residential and institutional facilities, drainage, water infrastructure, rehabilitation, maintenance, landscaping, and external works.',
        mission:
          'To deliver high-grade civil and engineering infrastructure that exceeds regulatory standards, maintains durability, and serves the long-term strategic needs of our clients and communities.',
        vision:
          'To be recognized as a premier engineering and contracting enterprise in Pakistan, distinguished by technical rigor, transparent execution, and structural integrity.',
        addressPrimary: 'Hamza Tower, F-11 Markaz',
        addressSecondary: 'Jawad Tower, University Road',
        city: 'Islamabad / Peshawar',
        province: 'Khyber Pakhtunkhwa / Federal',
        country: 'Pakistan',
        website: null,
        email: null,
        whatsapp: null,
        phonePrimary: null,
        phoneSecondary: null,
        facebook: null,
        linkedin: null,
        instagram: null,
        googleMapsUrl: null,
      }
    }
    return {
      legalName: company.legalName || 'M/S ELITE CONSTRUCTION COMPANY',
      displayName: company.displayName || 'ELITE CONSTRUCTION COMPANY',
      tagline: company.tagline,
      description: company.description,
      establishedYear: company.establishedYear || 2006,
      logoUrl: company.logoUrl,
      coverImageUrl: company.coverImageUrl,
      aboutText: company.aboutText,
      mission: company.mission,
      vision: company.vision,
      addressPrimary: company.addressPrimary,
      addressSecondary: company.addressSecondary,
      city: company.city,
      province: company.province,
      country: company.country,
      website: company.website,
      email: company.email,
      whatsapp: company.whatsapp,
      phonePrimary: company.phonePrimary,
      phoneSecondary: company.phoneSecondary,
      facebook: company.facebook,
      linkedin: company.linkedin,
      instagram: company.instagram,
      googleMapsUrl: company.googleMapsUrl,
    }
  } catch (error) {
    console.error('getPublicCompany error:', error)
    return {
      legalName: 'M/S ELITE CONSTRUCTION COMPANY',
      displayName: 'ELITE CONSTRUCTION COMPANY',
      tagline: 'Engineers & Constructors',
      description: null,
      establishedYear: 2006,
      logoUrl: null,
      coverImageUrl: null,
      aboutText: null,
      mission: null,
      vision: null,
      addressPrimary: null,
      addressSecondary: null,
      city: 'Peshawar',
      province: null,
      country: 'Pakistan',
      website: null,
      email: null,
      whatsapp: null,
      phonePrimary: null,
      phoneSecondary: null,
      facebook: null,
      linkedin: null,
      instagram: null,
      googleMapsUrl: null,
    }
  }
}
