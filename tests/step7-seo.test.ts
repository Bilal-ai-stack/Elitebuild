// =============================================================================
// ELITEBUILD — Step 7 Automated SEO & Discoverability Tests
// =============================================================================
// Verifies:
// 1. Base URL & canonical URL resolution
// 2. Metadata construction (title templates, descriptions, alternates, OG, Twitter)
// 3. Schema.org structured data (Organization, ConstructionBusiness, WebSite, Breadcrumbs)
// 4. Safe JSON-LD serialization against XSS / script injection
// 5. Dynamic robots.txt directives and exclusion of administrative surfaces
// =============================================================================

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { getBaseUrl, getCanonicalUrl, constructMetadata, SEO_DEFAULTS } from '../lib/seo/config.ts'
import {
  generateOrganizationSchema,
  generateWebSiteSchema,
  generateBreadcrumbSchema,
  serializeJsonLd,
} from '../lib/seo/structured-data.ts'
import robots from '../app/robots.ts'

describe('Step 7 — SEO & Discoverability Layer', () => {
  // -------------------------------------------------------------------------
  // 1. Canonical Base URL Resolution
  // -------------------------------------------------------------------------
  test('getBaseUrl respects NEXT_PUBLIC_APP_URL and trims trailing slashes', () => {
    const originalEnv = process.env.NEXT_PUBLIC_APP_URL

    try {
      process.env.NEXT_PUBLIC_APP_URL = 'https://eliteconstruction.pk/'
      assert.strictEqual(getBaseUrl(), 'https://eliteconstruction.pk')

      process.env.NEXT_PUBLIC_APP_URL = 'https://elitebuild.com'
      assert.strictEqual(getBaseUrl(), 'https://elitebuild.com')
    } finally {
      process.env.NEXT_PUBLIC_APP_URL = originalEnv
    }
  })

  test('getCanonicalUrl formats clean canonical URLs', () => {
    const originalEnv = process.env.NEXT_PUBLIC_APP_URL

    try {
      process.env.NEXT_PUBLIC_APP_URL = 'https://eliteconstruction.pk'

      assert.strictEqual(getCanonicalUrl('/'), 'https://eliteconstruction.pk/')
      assert.strictEqual(getCanonicalUrl('/projects'), 'https://eliteconstruction.pk/projects')
      assert.strictEqual(getCanonicalUrl('/projects/'), 'https://eliteconstruction.pk/projects')
      assert.strictEqual(getCanonicalUrl('services/road-construction'), 'https://eliteconstruction.pk/services/road-construction')
    } finally {
      process.env.NEXT_PUBLIC_APP_URL = originalEnv
    }
  })

  // -------------------------------------------------------------------------
  // 2. Metadata Construction
  // -------------------------------------------------------------------------
  test('constructMetadata builds valid canonical, OpenGraph, and Twitter structures', () => {
    const originalEnv = process.env.NEXT_PUBLIC_APP_URL

    try {
      process.env.NEXT_PUBLIC_APP_URL = 'https://eliteconstruction.pk'

      const meta = constructMetadata({
        title: 'Road & Highway Construction',
        description: 'Comprehensive highway and roadway civil works.',
        pathname: '/services/road-construction',
        image: '/uploads/services/road.jpg',
      })

      assert.strictEqual(meta.title, 'Road & Highway Construction')
      assert.strictEqual(meta.description, 'Comprehensive highway and roadway civil works.')
      assert.strictEqual(meta.alternates?.canonical, 'https://eliteconstruction.pk/services/road-construction')

      // Open Graph
      assert.strictEqual(meta.openGraph?.title, 'Road & Highway Construction')
      assert.strictEqual(meta.openGraph?.url, 'https://eliteconstruction.pk/services/road-construction')
      assert.strictEqual(meta.openGraph?.siteName, SEO_DEFAULTS.companyName)

      // Twitter
      assert.strictEqual((meta.twitter as { card?: string })?.card, 'summary_large_image')
      assert.strictEqual(meta.twitter?.title, 'Road & Highway Construction')
    } finally {
      process.env.NEXT_PUBLIC_APP_URL = originalEnv
    }
  })

  test('constructMetadata enforces noindex on 404 or unlisted pages', () => {
    const meta = constructMetadata({
      title: 'Resource Not Found',
      pathname: '/projects/unknown-project',
      noIndex: true,
    })

    assert.deepStrictEqual(meta.robots, {
      index: false,
      follow: false,
    })
  })

  // -------------------------------------------------------------------------
  // 3. Schema.org Structured Data Generation
  // -------------------------------------------------------------------------
  test('generateOrganizationSchema creates valid Organization / ConstructionBusiness JSON-LD', () => {
    const schema = generateOrganizationSchema({
      legalName: 'M/S ELITE CONSTRUCTION COMPANY',
      displayName: 'ELITEBUILD',
      establishedYear: 2006,
      phonePrimary: '+92 300 1234567',
      email: 'info@eliteconstruction.pk',
      addressPrimary: 'Hamza Tower, F-11 Markaz',
      city: 'Islamabad',
      country: 'Pakistan',
      facebook: 'https://facebook.com/elitebuild',
    })

    assert.strictEqual(schema['@context'], 'https://schema.org')
    assert.deepStrictEqual(schema['@type'], ['Organization', 'ConstructionBusiness'])
    assert.strictEqual(schema.name, 'M/S ELITE CONSTRUCTION COMPANY')
    assert.strictEqual(schema.foundingDate, '2006')
    assert.strictEqual(schema.telephone, '+92 300 1234567')
    assert.strictEqual(schema.email, 'info@eliteconstruction.pk')
    assert.deepStrictEqual(schema.address, {
      '@type': 'PostalAddress',
      streetAddress: 'Hamza Tower, F-11 Markaz',
      addressLocality: 'Islamabad',
      addressRegion: undefined,
      addressCountry: 'Pakistan',
    })
    assert.deepStrictEqual(schema.sameAs, ['https://facebook.com/elitebuild'])
  })

  test('generateBreadcrumbSchema outputs valid BreadcrumbList with correct hierarchy', () => {
    const breadcrumbs = generateBreadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Services', path: '/services' },
      { name: 'Road Infrastructure', path: '/services/road-infrastructure' },
    ])

    assert.strictEqual(breadcrumbs['@context'], 'https://schema.org')
    assert.strictEqual(breadcrumbs['@type'], 'BreadcrumbList')
    assert.strictEqual(breadcrumbs.itemListElement.length, 3)

    assert.strictEqual(breadcrumbs.itemListElement[0].position, 1)
    assert.strictEqual(breadcrumbs.itemListElement[0].name, 'Home')

    assert.strictEqual(breadcrumbs.itemListElement[2].position, 3)
    assert.strictEqual(breadcrumbs.itemListElement[2].name, 'Road Infrastructure')
  })

  test('serializeJsonLd safely escapes angle brackets to prevent script injection', () => {
    const dangerousPayload = {
      name: 'Engineering Works </script><script>alert("xss")</script>',
    }

    const serialized = serializeJsonLd(dangerousPayload)
    assert.ok(!serialized.includes('</script>'))
    assert.ok(serialized.includes('\\u003c/script>'))
  })

  // -------------------------------------------------------------------------
  // 4. Robots.txt Directives
  // -------------------------------------------------------------------------
  test('robots route allows public crawl and disallows administrative and API paths', () => {
    const config = robots()

    assert.ok(config.rules)
    const rule = Array.isArray(config.rules) ? config.rules[0] : config.rules
    assert.strictEqual(rule.allow, '/')
    assert.ok(Array.isArray(rule.disallow))
    assert.ok(rule.disallow.includes('/admin'))
    assert.ok(rule.disallow.includes('/admin/'))
    assert.ok(rule.disallow.includes('/api'))
    assert.ok(rule.disallow.includes('/api/'))

    assert.ok(typeof config.sitemap === 'string')
    assert.ok(config.sitemap.endsWith('/sitemap.xml'))
  })
})
