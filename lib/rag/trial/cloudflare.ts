// =============================================================================
// ELITEBUILD — Cloudflare Workers AI Client (Embeddings & Reranker)
// =============================================================================
// Provides REST API client for:
// 1. @cf/baai/bge-small-en-v1.5 (384-dimensional dense embeddings)
// 2. @cf/baai/bge-reranker-base (cross-encoder relevance reranker)
// =============================================================================

import { createHash } from 'crypto'
import type { CloudflareEmbeddingOptions, CloudflareRerankerOptions } from './types.ts'

export const DEFAULT_CLOUDFLARE_EMBEDDING_MODEL = '@cf/baai/bge-small-en-v1.5'
export const DEFAULT_CLOUDFLARE_RERANKER_MODEL = '@cf/baai/bge-reranker-base'
export const CLOUDFLARE_VECTOR_DIMENSION = 384

/**
 * Deterministic unit vector fallback (384 dimensions) when Cloudflare API is unconfigured.
 */
export function generateDeterministicVector(text: string, dimension = CLOUDFLARE_VECTOR_DIMENSION): number[] {
  const hash = createHash('sha256').update(text).digest()
  const vec: number[] = []
  for (let i = 0; i < dimension; i++) {
    const seed = createHash('sha256').update(Buffer.concat([hash, Buffer.from([i & 0xff, (i >> 8) & 0xff])])).digest()
    const rawInt = seed.readUInt32BE(0)
    const val = (rawInt / 0xffffffff) * 2.0 - 1.0
    vec.push(val)
  }
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0))
  return norm > 0 ? vec.map((v) => v / norm) : vec
}

/**
 * Fetch embeddings via Cloudflare Workers AI REST API.
 */
export async function getCloudflareEmbedding(
  text: string,
  options?: CloudflareEmbeddingOptions
): Promise<number[]> {
  const accountId = options?.accountId || process.env.CLOUDFLARE_ACCOUNT_ID
  const apiToken = options?.apiToken || process.env.CLOUDFLARE_AI_API_TOKEN
  const model = options?.model || process.env.EMBEDDING_MODEL || DEFAULT_CLOUDFLARE_EMBEDDING_MODEL

  if (!accountId || !apiToken) {
    // Graceful fallback to deterministic 384-dimensional unit vector
    return generateDeterministicVector(text, CLOUDFLARE_VECTOR_DIMENSION)
  }

  const cleanModel = model.startsWith('@cf/') ? model : `@cf/${model}`
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${cleanModel}`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: [text],
      }),
    })

    if (!res.ok) {
      console.warn(`Cloudflare embedding API responded with status ${res.status}. Falling back to deterministic vector.`)
      return generateDeterministicVector(text, CLOUDFLARE_VECTOR_DIMENSION)
    }

    const data = await res.json()
    // Cloudflare response structure: { result: { data: [[...384 float values...]] } }
    if (data?.result?.data?.[0] && Array.isArray(data.result.data[0])) {
      return data.result.data[0]
    }
    if (data?.result?.shape && Array.isArray(data.result.data)) {
      return data.result.data[0] || data.result.data
    }

    return generateDeterministicVector(text, CLOUDFLARE_VECTOR_DIMENSION)
  } catch (err) {
    console.warn('Cloudflare embedding request error:', err)
    return generateDeterministicVector(text, CLOUDFLARE_VECTOR_DIMENSION)
  }
}

/**
 * Rerank candidate texts using Cloudflare Workers AI cross-encoder model.
 */
export async function rerankWithCloudflare(
  query: string,
  candidates: Array<{ id: string; text: string }>,
  options?: CloudflareRerankerOptions
): Promise<Array<{ id: string; score: number }>> {
  if (!candidates || candidates.length === 0) return []

  const accountId = options?.accountId || process.env.CLOUDFLARE_ACCOUNT_ID
  const apiToken = options?.apiToken || process.env.CLOUDFLARE_AI_API_TOKEN
  const model = options?.model || process.env.RERANKER_MODEL || DEFAULT_CLOUDFLARE_RERANKER_MODEL

  if (!accountId || !apiToken) {
    // Pass-through with descending positional score fallback
    return candidates.map((c, i) => ({ id: c.id, score: 1.0 / (i + 1) }))
  }

  const cleanModel = model.startsWith('@cf/') ? model : `@cf/${model}`
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${cleanModel}`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        contexts: candidates.map((c) => ({ text: c.text })),
      }),
    })

    if (!res.ok) {
      return candidates.map((c, i) => ({ id: c.id, score: 1.0 / (i + 1) }))
    }

    const data = await res.json()
    // Cloudflare reranker response format:
    // { result: [ { id: 0, score: 0.98 }, { id: 1, score: 0.42 } ] }
    if (Array.isArray(data?.result)) {
      return data.result.map((item: { id: number; score: number }) => ({
        id: candidates[item.id]?.id || String(item.id),
        score: typeof item.score === 'number' ? item.score : 0.5,
      }))
    }

    return candidates.map((c, i) => ({ id: c.id, score: 1.0 / (i + 1) }))
  } catch (err) {
    console.warn('Cloudflare reranker request error:', err)
    return candidates.map((c, i) => ({ id: c.id, score: 1.0 / (i + 1) }))
  }
}
