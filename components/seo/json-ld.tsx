// =============================================================================
// ELITEBUILD — JSON-LD Script Component
// =============================================================================
// Safely renders JSON-LD structured data in server components.
// =============================================================================

import { serializeJsonLd } from '@/lib/seo/structured-data'

interface JsonLdProps {
  data: Record<string, unknown> | Array<Record<string, unknown>>
}

export function JsonLd({ data }: JsonLdProps) {
  const serialized = serializeJsonLd(data)

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serialized }}
    />
  )
}
