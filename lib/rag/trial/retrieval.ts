// =============================================================================
// ELITEBUILD — Trial RAG Mode: Pre-Retrieval Authorized PostgreSQL pgvector
// =============================================================================
// Queries Neon PostgreSQL pgvector with strict pre-retrieval authorization.
// Ensures unauthorized documents are NEVER retrieved into memory.
// =============================================================================

import prisma from '../../db/prisma.ts'
import type { SecurityAccessLevel, SourceAuthority } from '../types.ts'
import type { TrialChunkRecord } from './types.ts'

/**
 * Derives permitted security access levels strictly from user role.
 * Invariant: Clients can never escalate or expand clearance.
 */
export function getPermittedSecurityLevels(userRole: string): SecurityAccessLevel[] {
  switch (userRole) {
    case 'SUPER_ADMIN':
      return ['PUBLIC', 'AUTHENTICATED', 'EDITOR', 'ADMIN', 'PRIVATE']
    case 'ADMIN':
      return ['PUBLIC', 'AUTHENTICATED', 'EDITOR', 'ADMIN']
    case 'EDITOR':
      return ['PUBLIC', 'AUTHENTICATED', 'EDITOR']
    case 'AUTHENTICATED':
      return ['PUBLIC', 'AUTHENTICATED']
    case 'PUBLIC':
    default:
      return ['PUBLIC']
  }
}

/**
 * Retrieve verified knowledge chunks using dense pgvector similarity search.
 * Pre-retrieval filtering restricts by tenant, role clearance, and publication status.
 */
export async function retrieveAuthorizedChunks(params: {
  queryVector: number[]
  tenantId?: string
  userRole?: string
  topK?: number
}): Promise<TrialChunkRecord[]> {
  const tenantId = (params.tenantId || 'elitebuild-core').trim()
  const userRole = params.userRole || 'PUBLIC'
  const permittedLevels = getPermittedSecurityLevels(userRole)
  const topK = Math.min(Math.max(params.topK || 5, 1), 20)

  if (!params.queryVector || params.queryVector.length === 0) {
    return []
  }

  const vectorLiteral = `[${params.queryVector.join(',')}]`

  try {
    // Parameterized raw query using Prisma with pgvector cosine distance <=>
    // The WHERE clause guarantees that private/unauthorized chunks NEVER leave the database.
    const records = await prisma.$queryRawUnsafe<TrialChunkRecord[]>(
      `
      SELECT
        c.chunk_id,
        c.document_id,
        c.chunk_text,
        c.heading_path,
        c.chunk_index,
        c.security_access_level,
        c.source_authority,
        c.version_tag,
        c.jurisdiction,
        c.timestamp,
        c.content_hash,
        c.char_count,
        1 - (c.embedding <=> $1::vector) AS similarity
      FROM rag_chunks c
      WHERE c.tenant_id = $2
        AND c.security_access_level = ANY($3::text[])
        AND c.content_status = 'PUBLISHED'
        AND c.embedding IS NOT NULL
      ORDER BY c.embedding <=> $1::vector ASC
      LIMIT $4;
      `,
      vectorLiteral,
      tenantId,
      permittedLevels,
      topK
    )

    return records || []
  } catch (err: unknown) {
    // If the database is offline, table unpopulated, or pgvector extension uninstalled,
    // gracefully catch and return empty candidate set (no unhandled server 500s).
    console.warn('Authorized pgvector retrieval notice:', (err as Error)?.message || err)
    return []
  }
}
