'use client'

import { useEffect, useState } from 'react'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Database,
  Download,
  HelpCircle,
  Layers,
  Loader2,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import type { RagOperationalReport } from '@/lib/rag/types'

export default function AdminRagMonitoringPage() {
  const [report, setReport] = useState<RagOperationalReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [forbidden, setForbidden] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/rag-monitoring')
      if (res.status === 403) {
        setForbidden(true)
      } else {
        const json = await res.json()
        if (json.success && json.data) {
          setReport(json.data)
        } else {
          setError(json.error || 'Failed to load monitoring report')
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  function handleDownloadJson() {
    if (!report) return
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `elitebuild-rag-operational-report-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading && !report) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#315d7a]" />
      </div>
    )
  }

  if (forbidden) {
    return (
      <div className="border border-[#e7ebef] bg-white p-8 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-red-500" />
        <h1 className="mt-3 text-xl font-semibold text-[#17212b]">Access Restricted</h1>
        <p className="mt-2 text-sm text-[#5e6873]">
          Only administrators (SUPER_ADMIN and ADMIN) are permitted to inspect RAG production monitoring and quality gates.
        </p>
      </div>
    )
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'HEALTHY':
      case 'PASSED':
      case 'CURRENT':
      case 'IMPROVED':
      case 'STABLE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'DEGRADED':
      case 'WARNING':
      case 'INSUFFICIENT_DATA':
      case 'NOT_EVALUATED':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'UNAVAILABLE':
      case 'FAILED':
      case 'CRITICAL':
      case 'REGRESSED':
      case 'STALE':
        return 'bg-red-50 text-red-700 border-red-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#17212b]">RAG Production Monitoring</h1>
            {report && (
              <>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusColor(
                    report.service_status
                  )}`}
                >
                  {report.service_status === 'HEALTHY' && <CheckCircle2 className="h-3.5 w-3.5" />}
                  {report.service_status === 'DEGRADED' && <AlertTriangle className="h-3.5 w-3.5" />}
                  {report.service_status === 'UNAVAILABLE' && <AlertCircle className="h-3.5 w-3.5" />}
                  {report.service_status}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-800">
                  <Layers className="h-3.5 w-3.5 text-sky-600" />
                  MODE: {report.mode_label || (report.rag_mode === 'trial' ? 'TRIAL / SERVERLESS' : 'PRODUCTION / FASTAPI')}
                </span>
              </>
            )}
          </div>
          <p className="mt-1 text-xs text-[#5e6873]">
            Operational readiness, 12-subsystem health, quality gates, and evidence verification for ELITEBUILD RAG.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadJson}
            disabled={!report}
            className="inline-flex items-center gap-1.5 rounded border border-[#e7ebef] bg-white px-3 py-1.5 text-xs font-medium text-[#17212b] shadow-sm transition hover:bg-[#f7f8fa] disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export JSON
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded bg-[#315d7a] px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-[#254960] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          <p className="font-semibold">Monitoring Error</p>
          <p className="mt-0.5">{error}</p>
        </div>
      )}

      {/* Top Metric Cards */}
      {report && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Service Status */}
          <div className="border border-[#e7ebef] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-[#5e6873]">
              <span className="text-xs font-medium uppercase tracking-wider">Service Status</span>
              <Server className="h-4 w-4" />
            </div>
            <p className="mt-2 text-xl font-bold text-[#17212b]">{report.service_status}</p>
            <p className="mt-1 text-xs text-[#5e6873]">
              {report.mode_label || (report.rag_mode === 'trial' ? 'TRIAL / SERVERLESS' : 'PRODUCTION / FASTAPI')} • v{report.rag_version}
            </p>
          </div>

          {/* Quality Gate */}
          <div className="border border-[#e7ebef] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-[#5e6873]">
              <span className="text-xs font-medium uppercase tracking-wider">Quality Gate</span>
              <ShieldCheck className="h-4 w-4" />
            </div>
            <p className="mt-2 text-xl font-bold text-[#17212b]">{report.quality_gate_status}</p>
            <p className="mt-1 text-xs text-[#5e6873]">
              Benchmark v{report.last_evaluation?.benchmark_version || 'N/A'} • {report.last_evaluation?.total_cases || 0} cases
            </p>
          </div>

          {/* Regression State */}
          <div className="border border-[#e7ebef] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-[#5e6873]">
              <span className="text-xs font-medium uppercase tracking-wider">Regression Detection</span>
              {report.regression_status === 'IMPROVED' ? (
                <ArrowUpRight className="h-4 w-4 text-emerald-600" />
              ) : report.regression_status === 'REGRESSED' ? (
                <ArrowDownRight className="h-4 w-4 text-red-600" />
              ) : (
                <Activity className="h-4 w-4 text-[#5e6873]" />
              )}
            </div>
            <p className="mt-2 text-xl font-bold text-[#17212b]">{report.regression_status}</p>
            <p className="mt-1 text-xs text-[#5e6873]">
              {report.regression_summary.regressions_count} regressions • {report.regression_summary.improvements_count} improvements
            </p>
          </div>

          {/* Active Alerts */}
          <div className="border border-[#e7ebef] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-[#5e6873]">
              <span className="text-xs font-medium uppercase tracking-wider">Active Alerts</span>
              <AlertCircle className="h-4 w-4" />
            </div>
            <p className="mt-2 text-xl font-bold text-[#17212b]">
              {report.alert_summary.total_alerts}{' '}
              <span className="text-xs font-normal text-[#5e6873]">
                ({report.alert_summary.critical} critical)
              </span>
            </p>
            <p className="mt-1 text-xs text-[#5e6873]">
              {report.alert_summary.active_issues ? 'Action required' : 'Operational baseline normal'}
            </p>
          </div>
        </div>
      )}

      {/* Subsystem Health Grid */}
      {report && (
        <div className="border border-[#e7ebef] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#17212b]">
                {report.rag_mode === 'trial'
                  ? 'Serverless Subsystem Health & Probes'
                  : '12-Subsystem Health & Dependency Model'}
              </h2>
              <p className="text-xs text-[#5e6873]">
                {report.rag_mode === 'trial'
                  ? 'Real-time probes across Next.js RAG API, Neon pgvector, Cloudflare AI, Groq LLM, and storage.'
                  : 'Non-destructive real-time probes across core pipeline services and storage layers.'}
              </p>
            </div>
            <span className="text-[11px] text-[#5e6873]">
              Probed: {new Date(report.timestamp).toLocaleTimeString()}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Object.entries(report.component_status).map(([compName, status]) => (
              <div
                key={compName}
                className="flex items-center justify-between rounded border border-[#e7ebef] p-3 text-xs"
              >
                <div className="min-w-0 pr-2">
                  <p className="truncate font-semibold capitalize text-[#17212b]">
                    {report.rag_mode === 'trial'
                      ? compName === 'api'
                        ? 'Next.js RAG API'
                        : compName === 'database'
                        ? 'Neon PostgreSQL'
                        : compName === 'pgvector'
                        ? 'pgvector Extension'
                        : compName === 'embedding_provider'
                        ? 'Cloudflare Embedding'
                        : compName === 'reranker'
                        ? 'Cloudflare Reranker'
                        : compName === 'llm'
                        ? 'Groq LLM'
                        : compName === 'storage'
                        ? 'R2 Storage'
                        : compName === 'citation_validation'
                        ? 'Citation Validation'
                        : compName === 'retrieval'
                        ? 'Retrieval Engine'
                        : compName === 'ingestion'
                        ? 'Corporate Ingestion'
                        : compName === 'telemetry'
                        ? 'Telemetry & Tracing'
                        : compName.replace(/_/g, ' ')
                      : compName.replace(/_/g, ' ')}
                  </p>
                  <p className="text-[10px] text-[#5e6873]">Subsystem</p>
                </div>
                <span
                  className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-semibold ${statusColor(
                    status as string
                  )}`}
                >
                  {status}
                </span>
              </div>
            ))}
          </div>

          {report.degraded_reasons.length > 0 && (
            <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <p className="font-semibold">Degraded Mode Details:</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                {report.degraded_reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Quality Gate Breakdown */}
      {report && (
        <div className="border border-[#e7ebef] bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#17212b]">
                Quality Gate Policies & Evaluated Rules
              </h2>
              <p className="text-xs text-[#5e6873]">
                Deterministic pass/fail thresholds linking Step 13 evaluation benchmarks to Step 15 production gates.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {Object.entries(report.quality_gate_summary).map(([cat, stat]) => (
                <span
                  key={cat}
                  className={`rounded border px-2 py-0.5 text-[10px] font-medium capitalize ${statusColor(
                    stat as string
                  )}`}
                >
                  {cat}: {stat}
                </span>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#e7ebef] bg-[#f7f8fa] text-[11px] font-semibold text-[#5e6873]">
                <tr>
                  <th className="py-2.5 px-3">Rule</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Threshold</th>
                  <th className="py-2.5 px-3">Measured Value</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e7ebef]">
                {report.quality_gate_rules.map((r) => (
                  <tr key={r.rule} className="hover:bg-[#f7f8fa]">
                    <td className="py-2 px-3 font-medium text-[#17212b]">{r.rule}</td>
                    <td className="py-2 px-3 capitalize text-[#5e6873]">{r.category}</td>
                    <td className="py-2 px-3 font-mono text-[#5e6873]">
                      {r.operator} {r.threshold}
                    </td>
                    <td className="py-2 px-3 font-mono font-medium text-[#17212b]">
                      {r.actual !== null ? r.actual : 'NOT_EVALUATED'}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-block rounded border px-2 py-0.5 text-[10px] font-semibold ${statusColor(
                          r.status
                        )}`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-[#5e6873]">{r.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Operational SLAs & Ingestion Grid */}
      {report && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Latency & Reliability SLAs */}
          <div className="border border-[#e7ebef] bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#17212b]">
              Latency Distribution & Reliability
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-[#e7ebef] p-3">
                <span className="text-[11px] uppercase tracking-wider text-[#5e6873]">p50 Latency</span>
                <p className="mt-1 text-lg font-bold text-[#17212b]">
                  {report.realtime_latency.p50_ms !== null ? `${report.realtime_latency.p50_ms} ms` : 'N/A'}
                </p>
                <span className="text-[10px] text-[#5e6873]">Target &le; 50 ms</span>
              </div>
              <div className="border border-[#e7ebef] p-3">
                <span className="text-[11px] uppercase tracking-wider text-[#5e6873]">p95 Latency</span>
                <p className="mt-1 text-lg font-bold text-[#17212b]">
                  {report.realtime_latency.p95_ms !== null ? `${report.realtime_latency.p95_ms} ms` : 'N/A'}
                </p>
                <span className="text-[10px] text-[#5e6873]">Target &le; 200 ms</span>
              </div>
              <div className="border border-[#e7ebef] p-3">
                <span className="text-[11px] uppercase tracking-wider text-[#5e6873]">Error Rate</span>
                <p className="mt-1 text-lg font-bold text-[#17212b]">
                  {(report.reliability_metrics.error_rate * 100).toFixed(1)}%
                </p>
                <span className="text-[10px] text-[#5e6873]">
                  {report.reliability_metrics.successful_requests} ok / {report.reliability_metrics.failed_requests} fail
                </span>
              </div>
              <div className="border border-[#e7ebef] p-3">
                <span className="text-[11px] uppercase tracking-wider text-[#5e6873]">Security Events</span>
                <p className="mt-1 text-lg font-bold text-[#17212b]">
                  {report.security_status.total_security_events}
                </p>
                <span className="text-[10px] text-[#5e6873]">
                  {report.security_status.has_violations ? 'Violations logged' : 'Zero violations'}
                </span>
              </div>
            </div>
          </div>

          {/* Ingestion & Stale Knowledge Card */}
          <div className="border border-[#e7ebef] bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#17212b]">
              Ingestion Health & Stale Knowledge
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="border border-[#e7ebef] p-3 text-center">
                <span className="text-[10px] uppercase tracking-wider text-[#5e6873]">Indexed Docs</span>
                <p className="mt-1 text-lg font-bold text-[#17212b]">
                  {report.ingestion_status.total_documents}
                </p>
              </div>
              <div className="border border-[#e7ebef] p-3 text-center">
                <span className="text-[10px] uppercase tracking-wider text-[#5e6873]">Total Chunks</span>
                <p className="mt-1 text-lg font-bold text-[#17212b]">
                  {report.ingestion_status.total_chunks}
                </p>
              </div>
              <div className="border border-[#e7ebef] p-3 text-center">
                <span className="text-[10px] uppercase tracking-wider text-[#5e6873]">Embedded</span>
                <p className="mt-1 text-lg font-bold text-[#17212b]">
                  {report.ingestion_status.embedded_chunks}
                </p>
              </div>
            </div>

            <div className="mt-4 border-t border-[#e7ebef] pt-3 text-xs">
              <p className="font-semibold text-[#17212b]">Knowledge Freshness Audit:</p>
              <div className="mt-2 flex gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {report.ingestion_status.freshness_summary.current} Current
                </span>
                <span className="flex items-center gap-1.5 text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {report.ingestion_status.freshness_summary.stale} Stale
                </span>
                <span className="flex items-center gap-1.5 text-gray-500">
                  <HelpCircle className="h-3.5 w-3.5" />
                  {report.ingestion_status.freshness_summary.unknown} Unknown
                </span>
              </div>
              <p className="mt-2 text-[11px] text-[#5e6873]">
                Last Ingestion:{' '}
                {report.ingestion_status.last_successful_ingestion
                  ? new Date(report.ingestion_status.last_successful_ingestion).toLocaleString()
                  : 'No recorded ingestion run'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Active Alerts Feed */}
      {report && report.active_alerts.length > 0 && (
        <div className="border border-[#e7ebef] bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#17212b]">
            Operational Alerts Feed ({report.active_alerts.length})
          </h2>
          <div className="space-y-2">
            {report.active_alerts.map((alt) => (
              <div
                key={alt.alert_id}
                className="flex items-start justify-between rounded border border-[#e7ebef] p-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${statusColor(
                        alt.severity
                      )}`}
                    >
                      {alt.severity}
                    </span>
                    <span className="font-semibold text-[#17212b]">{alt.title}</span>
                    <span className="text-[10px] text-[#5e6873]">
                      Component: {alt.component}
                    </span>
                  </div>
                  <p className="text-[#5e6873]">{alt.message}</p>
                </div>
                <span className="shrink-0 text-[10px] text-[#5e6873]">
                  {new Date(alt.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
