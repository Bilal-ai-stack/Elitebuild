'use client'

import { useEffect, useState } from 'react'
import { Upload, Trash2, Loader2, FileText, Download, Shield, Lock, Globe } from 'lucide-react'
import { DOCUMENT_TYPES, DOCUMENT_VISIBILITIES } from '@/lib/constants'

interface DocumentItem {
  id: string
  title: string
  description: string | null
  documentType: string
  downloadUrl?: string
  visibility: string
  mimeType: string | null
  fileSize: number | null
  createdAt: string
}

export default function AdminDocumentsPage() {
  const [items, setItems] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [documentType, setDocumentType] = useState('OTHER')
  const [visibility, setVisibility] = useState('ADMIN_ONLY')
  const [file, setFile] = useState<File | null>(null)
  const [message, setMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/documents')
      const data = await res.json()
      if (data.success) setItems(data.data)
    } catch {
      setMessage('Failed to load documents.')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpload() {
    if (!file || !title) {
      setMessage('Title and file are required.')
      return
    }
    setUploading(true)
    setMessage('')
    setSuccessMessage('')
    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', title)
    formData.append('documentType', documentType)
    formData.append('visibility', visibility)

    try {
      const res = await fetch('/api/documents', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.success) {
        setTitle('')
        setFile(null)
        setDocumentType('OTHER')
        setVisibility('ADMIN_ONLY')
        setSuccessMessage('Document uploaded safely to isolated storage.')
        load()
      } else {
        setMessage(data.error?.message || 'Upload failed.')
      }
    } catch {
      setMessage('Error transmitting document to server.')
    } finally {
      setUploading(false)
    }
  }

  async function handleVisibilityChange(id: string, newVisibility: string) {
    setUpdatingId(id)
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: newVisibility }),
      })
      const data = await res.json()
      if (data.success) {
        setItems((prev) =>
          prev.map((d) => (d.id === id ? { ...d, visibility: newVisibility } : d))
        )
      } else {
        alert(data.error?.message || 'Failed to update visibility')
      }
    } catch {
      alert('Error updating document visibility.')
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to permanently delete this document from secure storage?')) return
    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setItems((prev) => prev.filter((d) => d.id !== id))
      } else {
        alert(data.error?.message || 'Delete failed')
      }
    } catch {
      alert('Error deleting document.')
    }
  }

  function formatSize(bytes: number | null) {
    if (bytes == null) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  function renderVisibilityBadge(vis: string) {
    switch (vis) {
      case 'PUBLIC':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200">
            <Globe className="h-3 w-3" /> Public
          </span>
        )
      case 'ADMIN_ONLY':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 border border-amber-200">
            <Shield className="h-3 w-3" /> Admin Only
          </span>
        )
      case 'PRIVATE':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 border border-red-200">
            <Lock className="h-3 w-3" /> Private
          </span>
        )
      default:
        return <span>{vis}</span>
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#5e6873]" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#17212b]">Document Vault & Archive</h1>
        <p className="mt-1 text-sm text-[#5e6873]">
          Confidential tenders, certificates, and institutional files are stored in isolated storage outside the public web root.
        </p>
      </div>

      <div className="mb-6 border border-[#e7ebef] bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-[#315d7a]">
          Upload Document to Secure Storage
        </h2>

        {message && (
          <div className="mb-3 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {message}
          </div>
        )}

        {successMessage && (
          <div className="mb-3 border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {successMessage}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Document Title *"
            className="border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2.5 text-sm outline-none focus:border-[#315d7a] sm:col-span-2"
          />
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#5e6873] mb-1">
              Document Classification
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2 text-sm outline-none focus:border-[#315d7a]"
            >
              {DOCUMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#5e6873] mb-1">
              Access Visibility
            </label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className="w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2 text-sm outline-none focus:border-[#315d7a]"
            >
              {DOCUMENT_VISIBILITIES.map((v) => (
                <option key={v} value={v}>
                  {v.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#5e6873] mb-1">
              Select File (PDF, DOCX, XLSX, Images — max 20MB)
            </label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-[#5e6873] file:mr-4 file:rounded file:border-0 file:bg-[#edf3f5] file:px-4 file:py-2 file:text-xs file:font-semibold file:text-[#315d7a] hover:file:bg-[#dde7eb]"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.txt"
            />
          </div>
        </div>

        <button
          onClick={handleUpload}
          disabled={uploading}
          className="mt-4 flex items-center gap-2 bg-[#315d7a] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#254860] disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload to Secure Vault
        </button>
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="border border-[#e7ebef] bg-white px-4 py-12 text-center text-sm text-[#5e6873]">
            No documents in vault. Use the upload form above to add corporate files.
          </div>
        ) : (
          items.map((item) => {
            const downloadUrl = item.downloadUrl || `/api/documents/${item.id}/download`
            return (
              <div
                key={item.id}
                className="flex flex-col justify-between gap-4 border border-[#e7ebef] bg-white p-4 shadow-sm sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-[#edf3f5] text-[#315d7a]">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[#17212b]">{item.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#5e6873]">
                      <span>{item.documentType.replace(/_/g, ' ')}</span>
                      <span>·</span>
                      <span>{formatSize(item.fileSize)}</span>
                      <span>·</span>
                      {renderVisibilityBadge(item.visibility)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  {/* Visibility Quick Changer */}
                  <select
                    value={item.visibility}
                    disabled={updatingId === item.id}
                    onChange={(e) => handleVisibilityChange(item.id, e.target.value)}
                    className="border border-[#d9dee4] bg-[#f7f8fa] px-2 py-1 text-xs outline-none focus:border-[#315d7a]"
                    aria-label="Change visibility"
                  >
                    {DOCUMENT_VISIBILITIES.map((v) => (
                      <option key={v} value={v}>
                        {v.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>

                  {/* Secure Download Link */}
                  <a
                    href={downloadUrl}
                    download
                    className="inline-flex items-center gap-1.5 rounded border border-[#d9dee4] bg-[#f7f8fa] px-3 py-1.5 text-xs font-semibold text-[#315d7a] transition hover:bg-[#edf3f5]"
                    title="Download authorized document"
                  >
                    <Download className="h-3.5 w-3.5" /> Download
                  </a>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="rounded p-1.5 text-[#5e6873] hover:bg-red-50 hover:text-red-600 transition"
                    aria-label="Delete document"
                    title="Delete document"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
