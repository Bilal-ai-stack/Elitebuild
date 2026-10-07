// =============================================================================
// ELITEBUILD — Trial RAG Mode TypeScript Types & Contracts
// =============================================================================

import type { RagCitation, RagStatus, SourceAuthority, SecurityAccessLevel } from '../types.ts'

export interface TrialChunkRecord {
  chunk_id: string
  document_id: string
  chunk_text: string
  heading_path?: string | null
  chunk_index: number
  security_access_level: SecurityAccessLevel
  source_authority: SourceAuthority
  version_tag: string
  jurisdiction: string
  timestamp: string | Date
  content_hash?: string | null
  char_count: number
  tenant_id?: string | null
  similarity?: number
  reranker_score?: number
}

export interface TrialEvidenceBlock {
  citationIndex: number
  documentId: string
  chunkId: string
  title: string
  headingPath?: string | null
  sourceAuthority: SourceAuthority
  versionTag: string
  timestamp?: string
  text: string
  similarity: number
  rerankerScore?: number
}

export interface CloudflareEmbeddingOptions {
  accountId?: string
  apiToken?: string
  model?: string
}

export interface CloudflareRerankerOptions {
  accountId?: string
  apiToken?: string
  model?: string
}

export interface GroqGenerationOptions {
  apiKey?: string
  model?: string
  temperature?: number
  maxTokens?: number
}
