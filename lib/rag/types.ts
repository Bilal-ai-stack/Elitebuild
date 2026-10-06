// =============================================================================
// ELITEBUILD — RAG Service TypeScript Client Contracts (Steps 10-15)
// =============================================================================
// Matches the FastAPI RAG microservice OpenAPI specification and Step 15
// operational monitoring & quality gate models.
// Provides type-safe contracts for Next.js client and server actions.
// =============================================================================

export type RagStatus =
  | 'SUPPORTED'
  | 'PARTIALLY_SUPPORTED'
  | 'CONFLICTING_EVIDENCE'
  | 'INSUFFICIENT_EVIDENCE'

export type RagOperationalStatus =
  | 'HEALTHY'
  | 'DEGRADED'
  | 'INSUFFICIENT_EVIDENCE'
  | 'CONFLICTING_EVIDENCE'
  | 'FAILED'

export type ComponentHealthStatus =
  | 'HEALTHY'
  | 'DEGRADED'
  | 'UNAVAILABLE'
  | 'NOT_CONFIGURED'
  | 'UNKNOWN'

export type ServiceHealthStatus =
  | 'HEALTHY'
  | 'DEGRADED'
  | 'UNAVAILABLE'

export type GateStatus =
  | 'PASSED'
  | 'FAILED'
  | 'NOT_EVALUATED'
  | 'INSUFFICIENT_DATA'

export type OverallGateStatus =
  | 'PASSED'
  | 'FAILED'
  | 'NOT_EVALUATED'
  | 'DEGRADED'

export type RegressionStatus =
  | 'IMPROVED'
  | 'STABLE'
  | 'REGRESSED'
  | 'NOT_COMPARABLE'
  | 'INSUFFICIENT_DATA'

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
  operationalStatus?: RagOperationalStatus
  degradedMode?: boolean
  degradedReasons?: string[]
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
  trace_id?: string
  status: RagStatus
  operationalStatus?: RagOperationalStatus
  answer: string
  citations: RagCitation[]
  sources?: string[] | RagCitation[]
  telemetry?: RagTelemetry
}

export interface RagHealthResponse {
  status: ServiceHealthStatus
  version: string
  timestamp: string
  environment?: string
  uptimeSeconds?: number
  components: Record<string, ComponentHealthStatus | string>
  degradedReasons?: string[]
}

export interface RagQualityGateRule {
  rule: string
  category: string
  status: GateStatus
  threshold: number
  actual: number | null
  operator: string
  description?: string
  message?: string
}

export interface RagAlert {
  alert_id: string
  alert_type: string
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
  title: string
  message: string
  component: string
  details?: Record<string, unknown>
  timestamp: string
}

export interface RagOperationalReport {
  report_id: string
  timestamp: string
  environment: string
  rag_version: string
  service_status: ServiceHealthStatus | string
  uptime_seconds: number
  component_status: Record<string, ComponentHealthStatus | string>
  component_details?: Record<string, unknown>
  degraded_reasons: string[]
  last_evaluation?: {
    evaluation_run_id?: string
    benchmark_version?: string
    benchmark_name?: string
    total_cases?: number
    timestamp?: string
    embedding_model?: string
    reranker_model?: string
    generation_model?: string
  } | null
  quality_gate_status: OverallGateStatus | string
  quality_gate_summary: Record<string, GateStatus | string>
  quality_gate_rules: RagQualityGateRule[]
  regression_status: RegressionStatus | string
  regression_summary: {
    has_regressions: boolean
    regressions_count: number
    improvements_count: number
    baseline_run?: string | null
    candidate_run?: string | null
  }
  retrieval_metrics: {
    state: string
    metrics: Record<string, number>
  }
  generation_metrics: {
    state: string
    metrics: Record<string, number>
  }
  citation_metrics: {
    state: string
    metrics: Record<string, number>
  }
  performance_metrics: {
    state: string
    metrics: Record<string, number>
  }
  realtime_latency: {
    p50_ms: number | null
    p95_ms: number | null
    sample_count: number
    state: string
  }
  reliability_metrics: {
    error_rate: number
    successful_requests: number
    failed_requests: number
    state: string
  }
  ingestion_status: {
    status: string
    total_documents: number
    total_chunks: number
    embedded_chunks: number
    embedding_failures: number
    freshness_summary: {
      current: number
      stale: number
      unknown: number
    }
    last_successful_ingestion?: string | null
  }
  security_status: {
    total_security_events: number
    has_violations: boolean
    event_counts: Record<string, number>
  }
  alert_summary: {
    total_alerts: number
    critical: number
    warning: number
    info: number
    active_issues: boolean
  }
  active_alerts: RagAlert[]
}
