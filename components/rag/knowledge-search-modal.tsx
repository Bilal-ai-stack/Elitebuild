'use client'

// =============================================================================
// ELITEBUILD — RAG Knowledge Search & Verification Modal (Step 16)
// =============================================================================
// Interactive client interface to query ELITEBUILD verified company records.
// Displays grounded answers, evidence status indicators, verifiable citations,
// and degraded-mode alerts adhering to company design language.
// =============================================================================

import { useState, useEffect, useRef } from 'react'
import {
  Search,
  X,
  FileText,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  ShieldAlert,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Cpu,
} from 'lucide-react'
import type { RagQueryResponse, RagStatus } from '@/lib/rag/types'

interface KnowledgeSearchModalProps {
  isOpen: boolean
  onClose: () => void
}

const EXAMPLE_QUERIES = [
  'What is Elite Construction Company’s PEC license category?',
  'What infrastructure projects has Elite completed for CWA?',
  'What quality standards and safety certifications does Elite hold?',
]

export function KnowledgeSearchModal({ isOpen, onClose }: KnowledgeSearchModalProps) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RagQueryResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedSnippetIndex, setExpandedSnippetIndex] = useState<number | null>(null)
  const [showTelemetry, setShowTelemetry] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleSearch = async (searchQuery: string) => {
    const trimmed = searchQuery.trim()
    if (!trimmed || trimmed.length < 2) return

    setLoading(true)
    setError(null)
    setResult(null)
    setExpandedSnippetIndex(null)

    try {
      const res = await fetch('/api/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        setError(json.error || 'Failed to complete knowledge search.')
      } else {
        setResult(json.data)
      }
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Network error occurred.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSearch(query)
  }

  const renderStatusBadge = (status: RagStatus) => {
    switch (status) {
      case 'SUPPORTED':
        return (
          <span className="inline-flex items-center gap-1.5 bg-[#dcfce7] px-2.5 py-1 text-xs font-semibold text-[#15803d]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Verified Documentation
          </span>
        )
      case 'PARTIALLY_SUPPORTED':
        return (
          <span className="inline-flex items-center gap-1.5 bg-[#fef3c7] px-2.5 py-1 text-xs font-semibold text-[#b45309]">
            <AlertTriangle className="h-3.5 w-3.5" />
            Partially Documented
          </span>
        )
      case 'CONFLICTING_EVIDENCE':
        return (
          <span className="inline-flex items-center gap-1.5 bg-[#f3e8ff] px-2.5 py-1 text-xs font-semibold text-[#6b21a8]">
            <HelpCircle className="h-3.5 w-3.5" />
            Conflicting Records Found
          </span>
        )
      case 'INSUFFICIENT_EVIDENCE':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 bg-[#f1f5f9] px-2.5 py-1 text-xs font-semibold text-[#475569]">
            <ShieldAlert className="h-3.5 w-3.5" />
            Insufficient Evidence
          </span>
        )
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#17212b]/70 p-4 pt-12 backdrop-blur-sm sm:p-6 sm:pt-20"
      role="dialog"
      aria-modal="true"
      aria-label="Verified Knowledge Search"
    >
      <div className="relative w-full max-w-3xl border border-[#dfe5e8] bg-white shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#dfe5e8] bg-[#f8fafb] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center bg-[#c58a2a] text-white">
              <Search className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold tracking-wider uppercase text-[#17212b]">
                Verified Knowledge Search
              </h2>
              <p className="text-[11px] text-[#5e6873]">
                Grounded search across M/S ELITE Construction official records
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#5e6873] hover:bg-[#e4e8eb] hover:text-[#17212b] transition"
            aria-label="Close search"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Form */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask about completed projects, certifications, machinery, or company profile..."
                className="w-full border border-[#cbd5e1] bg-white px-4 py-3 pr-10 text-sm text-[#17212b] placeholder-[#94a3b8] focus:border-[#315d7a] focus:outline-none focus:ring-1 focus:ring-[#315d7a]"
                disabled={loading}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-3.5 text-[#94a3b8] hover:text-[#17212b]"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || query.trim().length < 2}
              className="inline-flex items-center gap-2 bg-[#315d7a] px-5 py-3 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-[#254960] disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span>Search</span>
            </button>
          </form>

          {/* Example Queries */}
          {!result && !loading && (
            <div className="mt-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5e6873]">
                Suggested questions:
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {EXAMPLE_QUERIES.map((eq, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setQuery(eq)
                      handleSearch(eq)
                    }}
                    className="border border-[#e2e8f0] bg-[#f8fafb] px-3 py-1.5 text-xs text-[#315d7a] hover:border-[#315d7a] hover:bg-white transition text-left"
                  >
                    {eq}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="mt-8 flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#c58a2a]" />
              <p className="mt-3 text-sm font-semibold text-[#17212b]">Consulting Verified Knowledge Base</p>
              <p className="text-xs text-[#5e6873]">
                Retrieving authorized chunks, evaluating evidence, and formulating response...
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && !loading && (
            <div className="mt-6 border-l-4 border-[#dc2626] bg-[#fef2f2] p-4 text-xs text-[#991b1b]">
              <p className="font-semibold">Unable to process query</p>
              <p className="mt-1">{error}</p>
            </div>
          )}

          {/* Result Display */}
          {result && !loading && (
            <div className="mt-6 space-y-6">
              {/* Evidence & Health Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e2e8f0] pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#5e6873]">Evidence Assessment:</span>
                  {renderStatusBadge(result.status)}
                </div>

                {result.telemetry?.degradedMode && (
                  <span className="inline-flex items-center gap-1 bg-[#fff7ed] px-2 py-0.5 text-[11px] font-medium text-[#c2410c]">
                    <AlertTriangle className="h-3 w-3" /> Degraded Retrieval Mode
                  </span>
                )}
              </div>

              {/* Answer Box */}
              <div className="prose prose-sm max-w-none text-[#17212b]">
                <p className="leading-relaxed whitespace-pre-line text-sm">{result.answer}</p>
              </div>

              {/* Citations Section */}
              {result.citations && result.citations.length > 0 && (
                <div className="border-t border-[#e2e8f0] pt-4">
                  <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#17212b]">
                    <FileText className="h-3.5 w-3.5 text-[#315d7a]" />
                    Verified Citations ({result.citations.length})
                  </h4>
                  <div className="mt-3 space-y-2">
                    {result.citations.map((citation) => {
                      const isExpanded = expandedSnippetIndex === citation.index
                      return (
                        <div
                          key={citation.chunkId || citation.index}
                          className="border border-[#e2e8f0] bg-[#f8fafb] p-3 text-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-semibold text-[#17212b]">
                                [{citation.index}] {citation.title}
                              </span>
                              {citation.location && (
                                <span className="ml-2 text-[#5e6873]">({citation.location})</span>
                              )}
                              <div className="mt-1 flex items-center gap-2 text-[10px] text-[#5e6873]">
                                <span className="bg-[#e2e8f0] px-1.5 py-0.5 font-mono">
                                  v{citation.versionTag}
                                </span>
                                <span>{citation.sourceAuthority.replace(/_/g, ' ')}</span>
                              </div>
                            </div>
                            {citation.snippet && (
                              <button
                                onClick={() =>
                                  setExpandedSnippetIndex(isExpanded ? null : citation.index)
                                }
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#315d7a] hover:underline"
                              >
                                {isExpanded ? (
                                  <>
                                    Hide Excerpt <ChevronUp className="h-3 w-3" />
                                  </>
                                ) : (
                                  <>
                                    View Excerpt <ChevronDown className="h-3 w-3" />
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                          {isExpanded && citation.snippet && (
                            <blockquote className="mt-2.5 border-l-2 border-[#315d7a] pl-2.5 italic text-[#475569]">
                              &ldquo;{citation.snippet}&rdquo;
                            </blockquote>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Collapsible Telemetry Footer */}
              {result.telemetry && (
                <div className="border-t border-[#e2e8f0] pt-3 text-[11px] text-[#64748b]">
                  <button
                    onClick={() => setShowTelemetry(!showTelemetry)}
                    className="flex items-center gap-1 font-semibold text-[#5e6873] hover:text-[#17212b]"
                  >
                    <Cpu className="h-3 w-3" />
                    <span>Diagnostics & Latency</span>
                    {showTelemetry ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>

                  {showTelemetry && (
                    <div className="mt-2 grid grid-cols-2 gap-2 border border-[#e2e8f0] bg-[#f8fafb] p-2.5 sm:grid-cols-4">
                      <div>
                        <span className="block text-[10px] text-[#94a3b8]">Total Latency</span>
                        <span className="font-mono font-semibold text-[#17212b]">
                          {result.telemetry.totalLatencyMs} ms
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-[#94a3b8]">Retrieval Latency</span>
                        <span className="font-mono font-semibold text-[#17212b]">
                          {result.telemetry.retrievalLatencyMs} ms
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-[#94a3b8]">Tokens (In/Out)</span>
                        <span className="font-mono font-semibold text-[#17212b]">
                          {result.telemetry.promptTokens} / {result.telemetry.completionTokens}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-[#94a3b8]">Operational Status</span>
                        <span className="font-mono font-semibold text-[#17212b]">
                          {result.operationalStatus || 'HEALTHY'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#dfe5e8] bg-[#f8fafb] px-6 py-3 text-right">
          <button
            onClick={onClose}
            className="border border-[#cbd5e1] bg-white px-4 py-1.5 text-xs font-semibold text-[#17212b] transition hover:bg-[#e2e8f0]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
