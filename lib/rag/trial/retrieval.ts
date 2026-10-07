// =============================================================================
// ELITEBUILD — Trial RAG Mode: Pre-Retrieval Authorized PostgreSQL pgvector & Safe Lexical Engine
// =============================================================================
// Queries Neon PostgreSQL pgvector when embeddings are available, with safe,
// deterministic lexical/BM25 retrieval fallback when embedding service is offline.
// Invariant 1: Pre-retrieval filtering strictly isolates by tenant & clearance.
// Invariant 2: NEVER uses fake/synthetic vectors for semantic search.
// =============================================================================

import prisma from '../../db/prisma.ts'
import type { SecurityAccessLevel } from '../types.ts'
import type { TrialChunkRecord } from './types.ts'
import { VERIFIED_ELITEBUILD_CHUNKS } from './knowledge.ts'
import { retrieveLexicalCandidates } from './lexical.ts'

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

export interface RetrievalResult {
  chunks: TrialChunkRecord[]
  mode: 'SEMANTIC' | 'LEXICAL_DEGRADED'
  degradedReason?: string
}

/**
 * Retrieve verified knowledge chunks using either:
 * 1. Dense pgvector similarity search (when valid queryVector is supplied)
 * 2. Safe lexical/BM25 retrieval (explicit degraded mode when embedding is unavailable)
 *
 * Pre-retrieval filtering restricts by tenant, role clearance, and publication status.
 */
function isDatabaseReachable(): boolean {
  const dbUrl = process.env.DATABASE_URL || ''
  if (!dbUrl) return false
  // In serverless or cloud production environments, localhost databases are unreachable
  if (
    (process.env.VERCEL || process.env.NODE_ENV === 'production' || process.env.CI) &&
    (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1'))
  ) {
    return false
  }
  return true
}

export async function retrieveAuthorizedChunks(params: {
  query: string
  queryVector?: number[] | null
  tenantId?: string
  userRole?: string
  topK?: number
}): Promise<RetrievalResult> {
  const tenantId = (params.tenantId || 'elitebuild-core').trim()
  const userRole = params.userRole || 'PUBLIC'
  const permittedLevels = getPermittedSecurityLevels(userRole)
  const topK = Math.min(Math.max(params.topK || 5, 1), 20)
  const canQueryDb = isDatabaseReachable()

  // ---------------------------------------------------------------------------
  // Branch A: Dense Vector Retrieval (if real 384-dim embedding vector is present)
  // ---------------------------------------------------------------------------
  if (canQueryDb && params.queryVector && Array.isArray(params.queryVector) && params.queryVector.length === 384) {
    const vectorLiteral = `[${params.queryVector.join(',')}]`

    try {
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

      if (records && records.length > 0) {
        return { chunks: records, mode: 'SEMANTIC' }
      }
    } catch (err: unknown) {
      console.warn(
        'pgvector database query unavailable. Falling back to safe lexical retrieval:',
        (err as Error)?.message || err
      )
    }
  }

  // ---------------------------------------------------------------------------
  // Branch B: Safe Lexical Retrieval (Degraded Mode)
  // ---------------------------------------------------------------------------
  // 1. Attempt database PostgreSQL full-text search if connection is live
  if (canQueryDb) {
    try {
      const dbLexical = await prisma.$queryRawUnsafe<TrialChunkRecord[]>(
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
        ts_rank(to_tsvector('english', c.chunk_text), plainto_tsquery('english', $1)) AS similarity
      FROM rag_chunks c
      WHERE c.tenant_id = $2
        AND c.security_access_level = ANY($3::text[])
        AND c.content_status = 'PUBLISHED'
        AND to_tsvector('english', c.chunk_text) @@ plainto_tsquery('english', $1)
      ORDER BY similarity DESC
      LIMIT $4;
      `,
      params.query,
      tenantId,
      permittedLevels,
      topK
    )

    if (dbLexical && dbLexical.length > 0) {
      return {
        chunks: dbLexical,
        mode: 'LEXICAL_DEGRADED',
        degradedReason: 'CLOUDFLARE_EMBEDDING_UNAVAILABLE_LEXICAL_FALLBACK',
      }
    }
  } catch {
    // Database table unpopulated or offline — fall through to verified knowledge base
  }
}

  // 2. Authoritative verified knowledge base lexical search
  const authorizedKnowledgeChunks = VERIFIED_ELITEBUILD_CHUNKS.filter(
    (chunk) =>
      permittedLevels.includes(chunk.security_access_level as SecurityAccessLevel) &&
      (chunk.tenant_id ? chunk.tenant_id === tenantId : true)
  )

  const lexicalResults = retrieveLexicalCandidates(params.query, authorizedKnowledgeChunks, topK)

  return {
    chunks: lexicalResults,
    mode: 'LEXICAL_DEGRADED',
    degradedReason: 'CLOUDFLARE_EMBEDDING_UNAVAILABLE_LEXICAL_FALLBACK',
  }
}
