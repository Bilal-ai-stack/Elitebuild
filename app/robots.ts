// =============================================================================
// ELITEBUILD — Dynamic Robots.txt
// =============================================================================
// Directs search engine crawlers to public content and explicitly disallows
// admin dashboard, authentication, and internal API routes.
// =============================================================================

import type { MetadataRoute } from 'next'
import { getBaseUrl } from '../lib/seo/config.ts'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl()

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/',
          '/api',
          '/api/',
          '/_next/',
          '/storage/documents/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
