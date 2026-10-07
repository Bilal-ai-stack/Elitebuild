// =============================================================================
// ELITEBUILD — Trial RAG Engine Orchestrator
// =============================================================================
// Coordinates Next.js serverless pipeline:
// Auth Clearance → Cloudflare Embedding / Safe Lexical Retrieval → Rerank → Groq → Citations
// Invariant: Never uses fake/synthetic vectors for semantic search.
// =============================================================================

import { v4 as uuidv4 } from 'uuid'
import type { RagQueryResponse } from '../types.ts'
import { getCloudflareEmbedding, rerankWithCloudflare } from './cloudflare.ts'
import { retrieveAuthorizedChunks } from './retrieval.ts'
import { generateGroundedAnswer } from './groq.ts'
import type { TrialEvidenceBlock } from './types.ts'

export async function executeTrialQuery(params: {
  query: string
  tenantId?: string
  userRole?: string
  topK?: number
}): Promise<RagQueryResponse> {
  const startTime = Date.now()
  const traceId = `trace-${uuidv4()}`
  const requestId = `rag-trial-${uuidv4().slice(0, 8)}`
  const tenantId = (params.tenantId || 'elitebuild-core').trim()
  const userRole = params.userRole || 'PUBLIC'
  const topK = params.topK || 5

  // 1. Generate query embedding via Cloudflare Workers AI (384-dim)
  // Returns null if unconfigured/unavailable (NEVER returns synthetic vectors)
  const embedStart = Date.now()
  const queryVector = await getCloudflareEmbedding(params.query)
  const embedLatency = Date.now() - embedStart

  // 2. Pre-retrieval authorized retrieval
  // If embedding is available -> dense pgvector search
  // If embedding is null -> explicit safe lexical/BM25 degraded mode
  const retrieveStart = Date.now()
  const { chunks: candidateChunks, mode, degradedReason } = await retrieveAuthorizedChunks({
    query: params.query,
    queryVector,
    tenantId,
    userRole,
    topK: Math.max(topK * 3, 10),
  })
  const retrieveLatency = Date.now() - retrieveStart

  const isDegraded = mode === 'LEXICAL_DEGRADED' || queryVector === null

  // 3. Reranking
  const rerankStart = Date.now()
  let rankedChunks = candidateChunks

  if (candidateChunks.length > 0 && !isDegraded) {
    const rerankPairs = candidateChunks.map((c) => ({
      id: c.chunk_id,
      text: c.chunk_text,
    }))

    const scored = await rerankWithCloudflare(params.query, rerankPairs)
    const scoreMap = new Map(scored.map((s) => [s.id, s.score]))

    rankedChunks = candidateChunks
      .map((c) => ({
        ...c,
        reranker_score: scoreMap.get(c.chunk_id) ?? c.similarity ?? 0.5,
      }))
      .sort((a, b) => (b.reranker_score || 0) - (a.reranker_score || 0))
      .slice(0, topK)
  } else if (candidateChunks.length > 0) {
    // In degraded mode, sort strictly by lexical relevance score
    rankedChunks = candidateChunks
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
      .slice(0, topK)
  }
  const rerankLatency = Date.now() - rerankStart

  // 4. Package evidence blocks with deterministic citation IDs
  const evidenceBlocks: TrialEvidenceBlock[] = rankedChunks.map((chunk, idx) => ({
    citationIndex: idx + 1,
    documentId: chunk.document_id,
    chunkId: chunk.chunk_id,
    title: chunk.heading_path || chunk.document_id,
    headingPath: chunk.heading_path,
    sourceAuthority: chunk.source_authority,
    versionTag: chunk.version_tag,
    timestamp: chunk.timestamp ? String(chunk.timestamp) : undefined,
    text: chunk.chunk_text,
    similarity: chunk.similarity ?? 0.5,
    rerankerScore: chunk.reranker_score,
  }))

  // 5. Grounded Groq Generation & Citation Validation
  const genStart = Date.now()
  const { answer, status, citations, sources, tokens } = await generateGroundedAnswer(
    params.query,
    evidenceBlocks
  )
  const genLatency = Date.now() - genStart
  const totalLatency = Date.now() - startTime

  return {
    requestId,
    trace_id: traceId,
    status,
    operationalStatus: isDegraded ? 'DEGRADED' : 'HEALTHY',
    answer,
    citations,
    sources,
    telemetry: {
      totalLatencyMs: totalLatency,
      retrievalLatencyMs: retrieveLatency + embedLatency,
      rerankLatencyMs: rerankLatency,
      generationLatencyMs: genLatency,
      promptTokens: tokens.prompt,
      completionTokens: tokens.completion,
      estimatedCostUsd: 0,
      cacheHit: false,
      operationalStatus: isDegraded ? 'DEGRADED' : 'HEALTHY',
      degradedMode: isDegraded,
      degradedReasons: isDegraded
        ? [degradedReason || 'CLOUDFLARE_EMBEDDING_UNAVAILABLE_LEXICAL_FALLBACK']
        : undefined,
    },
  }
}
