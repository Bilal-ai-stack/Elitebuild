// =============================================================================
// ELITEBUILD — RAG Service TypeScript Client Contracts
// =============================================================================
// Matches the FastAPI RAG microservice OpenAPI specification (docs/RAG_API_SPEC.md).
// Provides type-safe contracts for Next.js client and server actions.
// =============================================================================

export type RagStatus =
  | 'SUPPORTED'
  | 'PARTIALLY_SUPPORTED'
  | 'CONFLICTING_EVIDENCE'
  | 'INSUFFICIENT_EVIDENCE'

export type SourceAuthority =
  | 'VERIFIED_DOCUMENT'
  | 'VERIFIED_PROJECT_RECORD'
  | 'VERIFIED_COMPANY_RECORD'
  | 'ADMIN_AUTHORED_CONTENT'
  | 'USER_PROVIDED_CONTENT'
  | 'UNKNOWN'

export type SecurityAccessLevel =
  | 'PUBLIC'
  | 'AUTHENTICATED'
  | 'EDITOR'
  | 'ADMIN'
  | 'PRIVATE'

export interface RagCitation {
  index: number
  documentId: string
  chunkId: string
  title: string
  sourceAuthority: SourceAuthority
  location?: string
  versionTag: string
  snippet: string
}

export interface RagTelemetry {
  totalLatencyMs: number
  retrievalLatencyMs: number
  rerankLatencyMs: number
  generationLatencyMs: number
  promptTokens: number
  completionTokens: number
  estimatedCostUsd: number
  cacheHit: boolean
}

export interface RagUserContext {
  userId?: string
  role: 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR' | 'PUBLIC'
  permittedSecurityLevels: SecurityAccessLevel[]
}

export interface RagQueryOptions {
  topK?: number
  minRerankScore?: number
  includeCitations?: boolean
  stream?: boolean
}

export interface RagQueryRequest {
  query: string
  tenantId?: string
  userContext?: RagUserContext
  options?: RagQueryOptions
}

export interface RagQueryResponse {
  requestId: string
  status: RagStatus
  answer: string
  citations: RagCitation[]
  telemetry?: RagTelemetry
}

export interface RagHealthResponse {
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY'
  version: string
  timestamp: string
  components: {
    vectorDatabase: string
    bm25Index: string
    embeddingService: string
    rerankerModel: string
  }
}
