// =============================================================================
// ELITEBUILD — Dynamic XML Sitemap
// =============================================================================
// Automatically generates sitemap.xml for search engines.
// Includes ONLY approved public static and dynamic published content.
// Excludes administrative, draft, private, and internal API routes.
// =============================================================================

import type { MetadataRoute } from 'next'
import prisma from '@/lib/db/prisma'
import { getBaseUrl } from '@/lib/seo/config'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl()

  // Retrieve latest modification timestamps from database
  let companyUpdatedAt: Date | undefined
  try {
    const company = await prisma.company.findFirst({ select: { updatedAt: true } })
    if (company?.updatedAt) companyUpdatedAt = company.updatedAt
  } catch {
    // Graceful fallback without fabricating timestamps
  }

  // 1. Core Public Static Pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: companyUpdatedAt,
      changeFrequency: 'monthly',
    },
    {
      url: `${baseUrl}/about`,
      lastModified: companyUpdatedAt,
      changeFrequency: 'monthly',
    },
    {
      url: `${baseUrl}/services`,
      changeFrequency: 'monthly',
    },
    {
      url: `${baseUrl}/projects`,
      changeFrequency: 'weekly',
    },
    {
      url: `${baseUrl}/capabilities`,
      changeFrequency: 'monthly',
    },
    {
      url: `${baseUrl}/team`,
      changeFrequency: 'monthly',
    },
    {
      url: `${baseUrl}/equipment`,
      changeFrequency: 'monthly',
    },
    {
      url: `${baseUrl}/credentials`,
      changeFrequency: 'monthly',
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: companyUpdatedAt,
      changeFrequency: 'monthly',
    },
  ]

  // 2. Dynamic Active Services
  let serviceRoutes: MetadataRoute.Sitemap = []
  try {
    const services = await prisma.service.findMany({
      where: { active: true },
      select: {
        slug: true,
        updatedAt: true,
      },
    })

    serviceRoutes = services.map((service) => ({
      url: `${baseUrl}/services/${service.slug}`,
      lastModified: service.updatedAt,
      changeFrequency: 'monthly',
    }))
  } catch (error) {
    console.error('Sitemap error loading services:', error)
  }

  // 3. Dynamic Published Projects (excluding drafts and archived projects)
  let projectRoutes: MetadataRoute.Sitemap = []
  try {
    const projects = await prisma.project.findMany({
      where: {
        contentStatus: 'PUBLISHED',
        status: { not: 'ARCHIVED' },
      },
      select: {
        id: true,
        slug: true,
        updatedAt: true,
      },
    })

    projectRoutes = projects.map((project) => ({
      url: `${baseUrl}/projects/${project.slug || project.id}`,
      lastModified: project.updatedAt,
      changeFrequency: 'monthly',
    }))
  } catch (error) {
    console.error('Sitemap error loading projects:', error)
  }

  return [...staticRoutes, ...serviceRoutes, ...projectRoutes]
}
