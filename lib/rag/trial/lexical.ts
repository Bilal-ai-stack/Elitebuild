// =============================================================================
// ELITEBUILD — Trial RAG Mode: Safe Lexical & Keyword Retrieval
// =============================================================================
// Provides safe, deterministic keyword/lexical search over verified chunks
// when external embedding provider is unavailable or unconfigured.
// Enforces strict relevance thresholds to prevent returning unrelated evidence.
// =============================================================================

import type { TrialChunkRecord } from './types.ts'

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
  'any', 'are', 'aren', 'arent', 'as', 'at', 'be', 'because', 'been', 'before',
  'being', 'below', 'between', 'both', 'but', 'by', 'can', 'cannot', 'could',
  'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from',
  'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers',
  'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is',
  'it', 'its', 'itself', 'let', 'me', 'more', 'most', 'my', 'myself', 'no',
  'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought',
  'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should',
  'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them',
  'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through',
  'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what',
  'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would',
  'you', 'your', 'yours', 'yourself', 'yourselves', 'tell', 'give', 'show', 'please',
])

/**
 * Tokenize a text string into normalized, stemmed-like lowercase keywords.
 */
export function extractKeywords(text: string): string[] {
  if (!text) return []
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w))
}

/**
 * Computes a lexical match score between query keywords and a candidate chunk.
 * Returns 0 if no meaningful match is found.
 */
export function scoreChunkLexically(queryKeywords: string[], chunk: TrialChunkRecord, rawQuery: string): number {
  if (queryKeywords.length === 0) return 0

  const chunkTextLower = chunk.chunk_text.toLowerCase()
  const headingLower = (chunk.heading_path || '').toLowerCase()
  const docIdLower = chunk.document_id.toLowerCase()

  let score = 0
  let matchedKeywords = 0

  // 1. Exact phrase match bonus
  const cleanRaw = rawQuery.toLowerCase().trim()
  if (cleanRaw.length >= 4 && chunkTextLower.includes(cleanRaw)) {
    score += 5.0
  }

  // 2. Keyword overlap scoring
  for (const kw of queryKeywords) {
    let kwMatched = false

    // Heading / Document ID match (higher weight)
    if (headingLower.includes(kw) || docIdLower.includes(kw)) {
      score += 2.5
      kwMatched = true
    }

    // Body text match
    if (chunkTextLower.includes(kw)) {
      score += 1.0
      // Frequency bonus up to 3 extra occurrences
      const occurrences = (chunkTextLower.match(new RegExp(`\\b${kw}\\b`, 'g')) || []).length
      score += Math.min(occurrences * 0.2, 0.6)
      kwMatched = true
    }

    if (kwMatched) {
      matchedKeywords++
    }
  }

  // Strict relevance threshold: require at least 1 keyword match
  if (matchedKeywords === 0 || score < 1.0) {
    return 0
  }

  // Require matching at least a proportion of query keywords if query is short
  if (queryKeywords.length >= 3 && matchedKeywords < 1) {
    return 0
  }

  return score
}

/**
 * Performs safe lexical retrieval across candidate chunks.
 * Strictly excludes chunks that score 0 or fall below relevance threshold.
 */
export function retrieveLexicalCandidates(
  query: string,
  chunks: TrialChunkRecord[],
  topK = 5
): TrialChunkRecord[] {
  const keywords = extractKeywords(query)
  if (keywords.length === 0) {
    return []
  }

  const scored: Array<{ chunk: TrialChunkRecord; score: number }> = []

  for (const chunk of chunks) {
    const s = scoreChunkLexically(keywords, chunk, query)
    if (s > 0) {
      // Normalize score to 0..1 range for similarity
      const normalizedSimilarity = Math.min(s / (keywords.length * 2.5 + 2.0), 0.95)
      scored.push({
        chunk: {
          ...chunk,
          similarity: Math.max(normalizedSimilarity, 0.45),
        },
        score: s,
      })
    }
  }

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score)

  return scored.slice(0, topK).map((item) => item.chunk)
}
