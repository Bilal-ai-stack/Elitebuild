// =============================================================================
// ELITEBUILD — Admin RAG Monitoring API Proxy Route
// =============================================================================
// Authenticated endpoint for Admin dashboard RAG monitoring.
// Role-gated: SUPER_ADMIN and ADMIN only.
// Forwards request to FastAPI RAG Service with service authentication.
// Returns structured operational report or safe degraded fallback if offline.
// =============================================================================

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { canViewRagMonitoring } from '@/lib/auth/permissions'
import type { RagOperationalReport } from '@/lib/rag/types'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  if (!canViewRagMonitoring(session.role)) {
    return NextResponse.json({ success: false, error: 'Forbidden: Admin access required' }, { status: 403 })
  }

  const ragBaseUrl = process.env.RAG_SERVICE_URL || 'http://127.0.0.1:8000'
  const serviceKey = process.env.RAG_SERVICE_API_KEY || ''

  try {
    const res = await fetch(`${ragBaseUrl}/api/v1/rag/operational-report`, {
      headers: {
        'X-RAG-Service-Key': serviceKey,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 0 },
    })

    if (!res.ok) {
      // Fallback structured report if RAG service returns non-200
      return NextResponse.json({
        success: true,
        data: {
          report_id: `rag-fallback-${Date.now()}`,
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'development',
          rag_version: '1.3.0',
          service_status: 'DEGRADED',
          uptime_seconds: 0,
          component_status: {
            api: 'DEGRADED',
            database: 'UNKNOWN',
            pgvector: 'UNKNOWN',
            embedding_provider: 'UNKNOWN',
            bm25: 'UNKNOWN',
            rrf: 'HEALTHY',
            reranker: 'UNKNOWN',
            llm: 'UNKNOWN',
            citation_validation: 'HEALTHY',
            ingestion: 'UNKNOWN',
            evaluation: 'UNKNOWN',
            telemetry: 'UNKNOWN',
          },
          degraded_reasons: [`RAG microservice returned HTTP ${res.status}`],
          quality_gate_status: 'NOT_EVALUATED',
          quality_gate_summary: {},
          quality_gate_rules: [],
          regression_status: 'INSUFFICIENT_DATA',
          regression_summary: {
            has_regressions: false,
            regressions_count: 0,
            improvements_count: 0,
          },
          retrieval_metrics: { state: 'NOT_AVAILABLE', metrics: {} },
          generation_metrics: { state: 'NOT_AVAILABLE', metrics: {} },
          citation_metrics: { state: 'NOT_AVAILABLE', metrics: {} },
          performance_metrics: { state: 'NOT_AVAILABLE', metrics: {} },
          realtime_latency: { p50_ms: null, p95_ms: null, sample_count: 0, state: 'NOT_AVAILABLE' },
          reliability_metrics: { error_rate: 0, successful_requests: 0, failed_requests: 0, state: 'NOT_AVAILABLE' },
          ingestion_status: {
            status: 'UNKNOWN',
            total_documents: 0,
            total_chunks: 0,
            embedded_chunks: 0,
            embedding_failures: 0,
            freshness_summary: { current: 0, stale: 0, unknown: 0 },
          },
          security_status: { total_security_events: 0, has_violations: false, event_counts: {} },
          alert_summary: { total_alerts: 1, critical: 0, warning: 1, info: 0, active_issues: true },
          active_alerts: [
            {
              alert_id: 'alt-service-status',
              alert_type: 'PROVIDER_UNAVAILABLE',
              severity: 'WARNING',
              title: 'RAG Service Status Notice',
              message: `Upstream RAG microservice responded with HTTP ${res.status}`,
              component: 'api',
              timestamp: new Date().toISOString(),
            },
          ],
        } satisfies RagOperationalReport,
      })
    }

    const data = await res.json()
    return NextResponse.json({ success: true, data })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Connection failed'
    // Graceful offline fallback
    return NextResponse.json({
      success: true,
      data: {
        report_id: `rag-offline-${Date.now()}`,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        rag_version: '1.3.0',
        service_status: 'UNAVAILABLE',
        uptime_seconds: 0,
        component_status: {
          api: 'UNAVAILABLE',
          database: 'UNKNOWN',
          pgvector: 'UNKNOWN',
          embedding_provider: 'UNKNOWN',
          bm25: 'UNKNOWN',
          rrf: 'HEALTHY',
          reranker: 'UNKNOWN',
          llm: 'UNKNOWN',
          citation_validation: 'HEALTHY',
          ingestion: 'UNKNOWN',
          evaluation: 'UNKNOWN',
          telemetry: 'UNKNOWN',
        },
        degraded_reasons: [`RAG microservice is offline or unreachable (${errorMsg})`],
        quality_gate_status: 'NOT_EVALUATED',
        quality_gate_summary: {},
        quality_gate_rules: [],
        regression_status: 'INSUFFICIENT_DATA',
        regression_summary: {
          has_regressions: false,
          regressions_count: 0,
          improvements_count: 0,
        },
        retrieval_metrics: { state: 'NOT_AVAILABLE', metrics: {} },
        generation_metrics: { state: 'NOT_AVAILABLE', metrics: {} },
        citation_metrics: { state: 'NOT_AVAILABLE', metrics: {} },
        performance_metrics: { state: 'NOT_AVAILABLE', metrics: {} },
        realtime_latency: { p50_ms: null, p95_ms: null, sample_count: 0, state: 'NOT_AVAILABLE' },
        reliability_metrics: { error_rate: 0, successful_requests: 0, failed_requests: 0, state: 'NOT_AVAILABLE' },
        ingestion_status: {
          status: 'UNAVAILABLE',
          total_documents: 0,
          total_chunks: 0,
          embedded_chunks: 0,
          embedding_failures: 0,
          freshness_summary: { current: 0, stale: 0, unknown: 0 },
        },
        security_status: { total_security_events: 0, has_violations: false, event_counts: {} },
        alert_summary: { total_alerts: 1, critical: 1, warning: 0, info: 0, active_issues: true },
        active_alerts: [
          {
            alert_id: 'alt-service-offline',
            alert_type: 'PROVIDER_UNAVAILABLE',
            severity: 'CRITICAL',
            title: 'RAG Service Offline',
            message: `Could not connect to RAG service at ${ragBaseUrl}: ${errorMsg}`,
            component: 'api',
            timestamp: new Date().toISOString(),
          },
        ],
      } satisfies RagOperationalReport,
    })
  }
}
