// =============================================================================
// ELITEBUILD — JSON-LD Structured Data Generator
// =============================================================================
// Constructs valid Schema.org entities using verified company data.
// Never fabricates reviews, ratings, price ranges, or unsubstantiated stats.
// =============================================================================

import { getBaseUrl, getCanonicalUrl, isSafePublicImageUrl } from './config.ts'

export interface StructuredDataCompany {
  legalName?: string | null
  displayName?: string | null
  description?: string | null
  establishedYear?: number | null
  logoUrl?: string | null
  addressPrimary?: string | null
  city?: string | null
  province?: string | null
  country?: string | null
  email?: string | null
  phonePrimary?: string | null
  phoneSecondary?: string | null
  website?: string | null
  facebook?: string | null
  linkedin?: string | null
  instagram?: string | null
}

/**
 * Builds Schema.org Organization / ConstructionBusiness structured data.
 */
export function generateOrganizationSchema(company?: StructuredDataCompany | null) {
  const baseUrl = getBaseUrl()
  const name = company?.legalName || company?.displayName || 'M/S ELITE CONSTRUCTION COMPANY'
  const description =
    company?.description ||
    'Established in 2006. Engineering, civil construction, road networks, bridge structures, building facilities, and project management across Pakistan.'

  const sameAs: string[] = []
  if (company?.facebook) sameAs.push(company.facebook)
  if (company?.linkedin) sameAs.push(company.linkedin)
  if (company?.instagram) sameAs.push(company.instagram)

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'ConstructionBusiness'],
    '@id': `${baseUrl}/#organization`,
    name,
    alternateName: company?.displayName || 'ELITEBUILD',
    url: company?.website || baseUrl,
    description,
    foundingDate: String(company?.establishedYear || 2006),
  }

  const logo = company?.logoUrl && isSafePublicImageUrl(company.logoUrl)
    ? (company.logoUrl.startsWith('http') ? company.logoUrl : `${baseUrl}${company.logoUrl.startsWith('/') ? company.logoUrl : `/${company.logoUrl}`}`)
    : `${baseUrl}/icon.svg`

  schema.logo = logo
  schema.image = logo

  if (company?.phonePrimary) {
    schema.telephone = company.phonePrimary
  }

  if (company?.email) {
    schema.email = company.email
  }

  if (company?.city || company?.country || company?.addressPrimary) {
    schema.address = {
      '@type': 'PostalAddress',
      streetAddress: company?.addressPrimary || undefined,
      addressLocality: company?.city || undefined,
      addressRegion: company?.province || undefined,
      addressCountry: company?.country || 'Pakistan',
    }
  }

  if (sameAs.length > 0) {
    schema.sameAs = sameAs
  }

  return schema
}

/**
 * Builds Schema.org WebSite structured data.
 */
export function generateWebSiteSchema() {
  const baseUrl = getBaseUrl()

  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${baseUrl}/#website`,
    url: baseUrl,
    name: 'M/S ELITE CONSTRUCTION COMPANY',
    description:
      'Engineering, civil construction, infrastructure, road networks, and bridge building in Pakistan.',
    publisher: {
      '@id': `${baseUrl}/#organization`,
    },
    inLanguage: 'en-US',
  }
}

export interface BreadcrumbItem {
  name: string
  path: string
}

/**
 * Builds Schema.org BreadcrumbList structured data.
 */
export function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: getCanonicalUrl(item.path),
    })),
  }
}

export interface ServiceSchemaInput {
  name: string
  description?: string | null
  slug: string
  coverImageUrl?: string | null
  category?: { name: string } | null
}

/**
 * Builds Schema.org Service structured data for dynamic service detail pages.
 */
export function generateServiceSchema(service: ServiceSchemaInput) {
  const baseUrl = getBaseUrl()
  const canonical = getCanonicalUrl(`/services/${service.slug}`)

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${canonical}/#service`,
    url: canonical,
    name: service.name,
    description: service.description || `Civil engineering and construction services for ${service.name}.`,
    provider: {
      '@id': `${baseUrl}/#organization`,
    },
  }

  if (service.category?.name) {
    schema.serviceType = service.category.name
  }

  if (service.coverImageUrl && isSafePublicImageUrl(service.coverImageUrl)) {
    schema.image = service.coverImageUrl.startsWith('http')
      ? service.coverImageUrl
      : `${baseUrl}${service.coverImageUrl.startsWith('/') ? service.coverImageUrl : `/${service.coverImageUrl}`}`
  }

  return schema
}

export interface ProjectWebPageSchemaInput {
  title: string
  description?: string | null
  slug?: string | null
  id: string
  coverImageUrl?: string | null
  location?: string | null
}

/**
 * Builds Schema.org WebPage structured data for project detail pages,
 * accurately reflecting contract execution details without inventing unsupported schemas.
 */
export function generateProjectWebPageSchema(project: ProjectWebPageSchemaInput) {
  const baseUrl = getBaseUrl()
  const canonical = getCanonicalUrl(`/projects/${project.slug || project.id}`)

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${canonical}/#webpage`,
    url: canonical,
    name: `${project.title} | ELITE CONSTRUCTION COMPANY`,
    description: project.description || `Engineering contract and execution details for ${project.title}.`,
    isPartOf: {
      '@id': `${baseUrl}/#website`,
    },
    about: {
      '@type': 'Thing',
      name: project.title,
      description: project.description || undefined,
    },
  }

  const img = project.coverImageUrl
  if (img && isSafePublicImageUrl(img)) {
    const fullImg = img.startsWith('http')
      ? img
      : `${baseUrl}${img.startsWith('/') ? img : `/${img}`}`
    schema.primaryImageOfPage = {
      '@type': 'ImageObject',
      url: fullImg,
    }
  }

  return schema
}

/**
 * Serializes structured data safely into a script-safe JSON string,
 * escaping HTML special characters to prevent any script/HTML injection vectors.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

