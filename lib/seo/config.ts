// =============================================================================
// ELITEBUILD — SEO & Discoverability Configuration
// =============================================================================
// Centralized configuration for canonical URLs, metadata defaults,
// Open Graph, and Twitter/X card metadata.
// =============================================================================

import type { Metadata } from 'next'

/**
 * Resolves the canonical base URL of the application.
 * Prioritizes NEXT_PUBLIC_APP_URL, then NEXTAUTH_URL, with local fallback.
 * Strictly guarantees no trailing slash.
 */
export function getBaseUrl(): string {
  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    'http://localhost:3000'

  return envUrl.replace(/\/+$/, '')
}

/**
 * Builds an absolute canonical URL from a pathname, ensuring query parameters
 * and hash fragments are cleanly stripped.
 */
export function getCanonicalUrl(pathname: string): string {
  const baseUrl = getBaseUrl()
  const cleanPathname = pathname.split('?')[0].split('#')[0]
  const cleanPath = cleanPathname.startsWith('/') ? cleanPathname : `/${cleanPathname}`
  // Clean trailing slash for all paths except root
  if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
    return `${baseUrl}${cleanPath.slice(0, -1)}`
  }
  return `${baseUrl}${cleanPath}`
}

export const SEO_DEFAULTS = {
  companyName: 'M/S ELITE CONSTRUCTION COMPANY',
  brandName: 'ELITE CONSTRUCTION COMPANY',
  shortName: 'ELITEBUILD',
  descriptor: 'Engineers & Constructors',
  defaultTitle: 'ELITE CONSTRUCTION COMPANY | Engineers & Constructors',
  titleTemplate: '%s | ELITE CONSTRUCTION COMPANY',
  defaultDescription:
    'Established in 2006. Engineering, civil construction, road networks, bridge structures, building facilities, and project management across Pakistan.',
  locale: 'en_US',
  socialShareImage: '/og-image.png',
} as const

/**
 * Validates that an image URL is safe and suitable for public social sharing.
 * Rejects private documents, internal admin assets, or dangerous URIs.
 */
export function isSafePublicImageUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false
  const trimmed = url.trim()
  if (!trimmed) return false

  // Reject internal or protected resource routes
  if (
    trimmed.includes('/api/documents/') ||
    trimmed.includes('/admin/') ||
    trimmed.includes('/storage/documents/') ||
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:')
  ) {
    return false
  }

  return true
}

export interface PageMetadataOptions {
  title: string
  description?: string
  pathname: string
  image?: string | null
  noIndex?: boolean
}

/**
 * Helper to generate consistent, standards-compliant Next.js page metadata.
 */
export function constructMetadata({
  title,
  description,
  pathname,
  image,
  noIndex = false,
}: PageMetadataOptions): Metadata {
  const canonical = getCanonicalUrl(pathname)
  const resolvedDesc = description || SEO_DEFAULTS.defaultDescription

  // Verify and resolve image URL safely
  const safeImage = isSafePublicImageUrl(image) ? image : null
  const resolvedImage = safeImage
    ? safeImage.startsWith('http')
      ? safeImage
      : `${getBaseUrl()}${safeImage.startsWith('/') ? safeImage : `/${safeImage}`}`
    : `${getBaseUrl()}${SEO_DEFAULTS.socialShareImage}`

  const metadata: Metadata = {
    title,
    description: resolvedDesc,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description: resolvedDesc,
      url: canonical,
      siteName: SEO_DEFAULTS.companyName,
      locale: SEO_DEFAULTS.locale,
      type: 'website',
      images: [
        {
          url: resolvedImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: resolvedDesc,
      images: [resolvedImage],
    },
  }

  if (noIndex) {
    metadata.robots = {
      index: false,
      follow: false,
    }
  }

  return metadata
}

