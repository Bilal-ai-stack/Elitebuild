// =============================================================================
// ELITEBUILD — Authenticated RAG Query API Proxy Route (Step 16)
// =============================================================================
// Connects the Next.js client to the FastAPI RAG microservice.
// - Authenticates the request server-side via Next.js session JWT.
// - Injects verified X-User-Role and X-User-Id headers (clients cannot spoof).
// - Enforces pre-retrieval query validation & length constraints.
// - Provides graceful degraded fallback if the RAG microservice is unreachable.
// =============================================================================

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import type { RagQueryResponse } from '@/lib/rag/types'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const rawQuery = typeof body.query === 'string' ? body.query.trim() : ''

    if (!rawQuery || rawQuery.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Query must be at least 2 characters.' },
        { status: 400 }
      )
    }

    if (rawQuery.length > 1000) {
      return NextResponse.json(
        { success: false, error: 'Query cannot exceed 1000 characters.' },
        { status: 400 }
      )
    }

    // 1. Check server-side session to determine verified role
    const session = await getSession()
    const userRole = session?.role || 'PUBLIC'
    const userId = session?.userId || ''

    // 2. Prepare upstream microservice payload and headers
    const ragBaseUrl = process.env.RAG_SERVICE_URL || 'http://127.0.0.1:8000'
    const serviceKey = process.env.RAG_SERVICE_API_KEY || ''
    const tenantId = typeof body.tenantId === 'string' && body.tenantId.trim()
      ? body.tenantId.trim()
      : 'elitebuild-core'

    const topK = typeof body.options?.topK === 'number'
      ? Math.min(Math.max(body.options.topK, 1), 20)
      : 5

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 25000) // 25s timeout

    try {
      const res = await fetch(`${ragBaseUrl}/api/v1/rag/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': userRole,
          'X-User-Id': userId,
          'X-RAG-Service-Key': serviceKey,
        },
        body: JSON.stringify({
          query: rawQuery,
          tenant_id: tenantId,
          options: {
            top_k: topK,
          },
        }),
        signal: controller.signal,
        next: { revalidate: 0 },
      })

      clearTimeout(timeoutId)

      if (!res.ok) {
        const errorDetail = await res.text().catch(() => 'Upstream service error')
        return NextResponse.json({
          success: true,
          data: {
            requestId: `rag-fallback-${Date.now()}`,
            status: 'INSUFFICIENT_EVIDENCE',
            operationalStatus: 'DEGRADED',
            answer: 'The verified knowledge base could not complete this request at this time. Please contact M/S ELITE Construction Company directly.',
            citations: [],
            telemetry: {
              totalLatencyMs: 0,
              retrievalLatencyMs: 0,
              rerankLatencyMs: 0,
              generationLatencyMs: 0,
              promptTokens: 0,
              completionTokens: 0,
              estimatedCostUsd: 0,
              cacheHit: false,
              operationalStatus: 'DEGRADED',
              degradedMode: true,
              degradedReasons: [`RAG microservice returned HTTP ${res.status}: ${errorDetail.slice(0, 100)}`],
            },
          } satisfies RagQueryResponse,
        })
      }

      const upstreamData = await res.json()

      // Map Python snake_case to TypeScript camelCase if needed
      const response: RagQueryResponse = {
        requestId: upstreamData.request_id || `rag-${Date.now()}`,
        status: upstreamData.status || 'INSUFFICIENT_EVIDENCE',
        operationalStatus: upstreamData.operational_status || 'HEALTHY',
        answer: upstreamData.answer || '',
        citations: (upstreamData.citations || []).map((c: Record<string, unknown>, idx: number) => ({
          index: (c.index as number) || idx + 1,
          documentId: (c.document_id as string) || '',
          chunkId: (c.chunk_id as string) || '',
          title: (c.title as string) || 'Document Reference',
          sourceAuthority: (c.source_authority as any) || 'VERIFIED_DOCUMENT',
          location: (c.location as string) || undefined,
          versionTag: (c.version_tag as string) || '1.0',
          snippet: (c.snippet as string) || '',
        })),
        telemetry: upstreamData.telemetry
          ? {
              totalLatencyMs: upstreamData.telemetry.total_latency_ms || 0,
              retrievalLatencyMs: upstreamData.telemetry.retrieval_latency_ms || 0,
              rerankLatencyMs: upstreamData.telemetry.rerank_latency_ms || 0,
              generationLatencyMs: upstreamData.telemetry.generation_latency_ms || 0,
              promptTokens: upstreamData.telemetry.input_tokens || 0,
              completionTokens: upstreamData.telemetry.output_tokens || 0,
              estimatedCostUsd: upstreamData.telemetry.estimated_cost_usd || 0,
              cacheHit: false,
              operationalStatus: upstreamData.telemetry.operational_status,
              degradedMode: upstreamData.telemetry.degraded_mode || false,
              degradedReasons: upstreamData.telemetry.degraded_reasons || [],
            }
          : undefined,
      }

      return NextResponse.json({ success: true, data: response })
    } catch (fetchErr: unknown) {
      clearTimeout(timeoutId)
      const isAbort = (fetchErr as Error)?.name === 'AbortError'
      const msg = isAbort ? 'RAG query timed out' : ((fetchErr as Error)?.message || 'Connection failed')

      return NextResponse.json({
        success: true,
        data: {
          requestId: `rag-offline-${Date.now()}`,
          status: 'INSUFFICIENT_EVIDENCE',
          operationalStatus: 'DEGRADED',
          answer: 'The verified knowledge service is currently offline or unreachable. Please contact M/S ELITE Construction Company directly via WhatsApp or our Contact page.',
          citations: [],
          telemetry: {
            totalLatencyMs: 0,
            retrievalLatencyMs: 0,
            rerankLatencyMs: 0,
            generationLatencyMs: 0,
            promptTokens: 0,
            completionTokens: 0,
            estimatedCostUsd: 0,
            cacheHit: false,
            operationalStatus: 'DEGRADED',
            degradedMode: true,
            degradedReasons: [`RAG microservice unreachable: ${msg}`],
          },
        } satisfies RagQueryResponse,
      })
    }
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: (err as Error)?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
