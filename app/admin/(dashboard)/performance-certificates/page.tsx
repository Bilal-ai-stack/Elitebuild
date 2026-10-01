'use client'

import { useEffect, useState } from 'react'
import { Plus, Save, Trash2, Loader2, Pencil, X, Award, Search, CheckCircle2, XCircle, FileText, ExternalLink } from 'lucide-react'

interface Certificate {
  id: string
  title: string
  projectId: string | null
  issuedById: string | null
  issueDate: string | null
  description: string | null
  documentUrl: string | null
  imageUrl: string | null
  verified: boolean
  active: boolean
  createdAt: string
  project?: {
    id: string
    title: string
    slug: string
  } | null
  issuedBy?: {
    id: string
    name: string
    shortName: string | null
  } | null
}

interface ProjectOption {
  id: string
  title: string
}

interface OrgOption {
  id: string
  name: string
  shortName: string | null
}

interface DocumentOption {
  id: string
  title: string
  fileUrl: string
  visibility: string
}

const emptyForm = {
  title: '',
  projectId: '',
  issuedById: '',
  issueDate: '',
  description: '',
  documentUrl: '',
  imageUrl: '',
  verified: false,
  active: true,
}

export default function AdminPerformanceCertificatesPage() {
  const [items, setItems] = useState<Certificate[]>([])
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [organizations, setOrganizations] = useState<OrgOption[]>([])
  const [documents, setDocuments] = useState<DocumentOption[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    load()
    loadOptions()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/performance-certificates')
      const data = await res.json()
      if (data.success) {
        setItems(data.data)
      }
    } catch {
      setMessage('Failed to load performance certificates.')
    } finally {
      setLoading(false)
    }
  }

  async function loadOptions() {
    try {
      const [projRes, orgRes, docRes] = await Promise.all([
        fetch('/api/projects?pageSize=100'),
        fetch('/api/client-organizations'),
        fetch('/api/documents'),
      ])
      const projData = await projRes.json()
      if (projData.success && projData.data?.projects) {
        setProjects(projData.data.projects.map((p: any) => ({ id: p.id, title: p.title })))
      }
      const orgData = await orgRes.json()
      if (orgData.success) {
        setOrganizations(orgData.data)
      }
      const docData = await docRes.json()
      if (docData.success) {
        setDocuments(docData.data)
      }
    } catch {
      // Non-critical background load
    }
  }

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setMessage('')
    setShowForm(true)
  }

  function openEdit(item: Certificate) {
    setEditingId(item.id)
    setForm({
      title: item.title,
      projectId: item.projectId || '',
      issuedById: item.issuedById || '',
      issueDate: item.issueDate ? item.issueDate.split('T')[0] : '',
      description: item.description || '',
      documentUrl: item.documentUrl || '',
      imageUrl: item.imageUrl || '',
      verified: item.verified,
      active: item.active,
    })
    setMessage('')
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.title.trim()) return
    setSaving(true)
    setMessage('')
    const url = editingId ? `/api/performance-certificates/${editingId}` : '/api/performance-certificates'
    const method = editingId ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          projectId: form.projectId || null,
          issuedById: form.issuedById || null,
          issueDate: form.issueDate ? new Date(form.issueDate).toISOString() : null,
          documentUrl: form.documentUrl || null,
          imageUrl: form.imageUrl || null,
        }),
      })
      const result = await res.json()
      if (result.success) {
        setShowForm(false)
        setMessage(editingId ? 'Certificate updated successfully.' : 'Certificate created successfully.')
        load()
      } else {
        setMessage(result.error?.message || 'Failed to save certificate.')
      }
    } catch {
      setMessage('Network error. Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this performance certificate?')) return
    try {
      const res = await fetch(`/api/performance-certificates/${id}`, { method: 'DELETE' })
      const result = await res.json()
      if (result.success) {
        setMessage('Certificate deleted successfully.')
        load()
      } else {
        setMessage(result.error?.message || 'Failed to delete certificate.')
      }
    } catch {
      setMessage('Network error. Failed to delete.')
    }
  }

  async function handleToggleVerified(item: Certificate) {
    try {
      const res = await fetch(`/api/performance-certificates/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified: !item.verified }),
      })
      const result = await res.json()
      if (result.success) {
        setItems((prev) =>
          prev.map((c) => (c.id === item.id ? { ...c, verified: !c.verified } : c)),
        )
      }
    } catch {
      setMessage('Failed to toggle verification.')
    }
  }

  const filteredItems = items.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.project && c.project.title.toLowerCase().includes(search.toLowerCase())) ||
      (c.issuedBy && c.issuedBy.name.toLowerCase().includes(search.toLowerCase())),
  )

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#5e6873]" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#17212b]">Performance Certificates</h1>
          <p className="mt-1 text-sm text-[#5e6873]">
            Maintain client-issued work completion certificates, project evaluations, and satisfactory performance records.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[#315d7a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#264a63]"
        >
          <Plus className="h-4 w-4" /> Add Certificate
        </button>
      </div>

      {message && (
        <div
          className={`mb-4 border px-4 py-3 text-sm ${
            message.includes('success') || message.includes('created') || message.includes('updated')
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {message}
        </div>
      )}

      {/* Form Card */}
      {showForm && (
        <div className="mb-6 border border-[#315d7a] bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between border-b border-[#e7ebef] pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#315d7a]">
              {editingId ? 'Edit Certificate' : 'New Performance Certificate'}
            </h2>
            <button onClick={() => setShowForm(false)} aria-label="Close form">
              <X className="h-4 w-4 text-[#5e6873]" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#5e6873]">Certificate Title *</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Substantial Completion Certificate — Swat Expressway Bridge Works"
                className="mt-1 w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2 text-sm outline-none focus:border-[#315d7a]"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-[#5e6873]">Associated Project</label>
                <select
                  value={form.projectId}
                  onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                  className="mt-1 w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2 text-sm outline-none focus:border-[#315d7a]"
                >
                  <option value="">-- No project linked --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5e6873]">Issuing Client Organization</label>
                <select
                  value={form.issuedById}
                  onChange={(e) => setForm({ ...form, issuedById: e.target.value })}
                  className="mt-1 w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2 text-sm outline-none focus:border-[#315d7a]"
                >
                  <option value="">-- No organization linked --</option>
                  {organizations.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} {o.shortName ? `(${o.shortName})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-[#5e6873]">Issue Date</label>
                <input
                  type="date"
                  value={form.issueDate}
                  onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
                  className="mt-1 w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2 text-sm outline-none focus:border-[#315d7a]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5e6873]">
                  Select Secure Document (From Step 3 Storage)
                </label>
                <select
                  value={form.documentUrl}
                  onChange={(e) => setForm({ ...form, documentUrl: e.target.value })}
                  className="mt-1 w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2 text-sm outline-none focus:border-[#315d7a]"
                >
                  <option value="">-- Manual URL or None --</option>
                  {documents.map((doc) => (
                    <option key={doc.id} value={`/api/documents/${doc.id}/download`}>
                      {doc.title} ({doc.visibility})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5e6873]">Custom Document / Reference URL</label>
              <input
                value={form.documentUrl}
                onChange={(e) => setForm({ ...form, documentUrl: e.target.value })}
                placeholder="e.g. /api/documents/[id]/download or verified secure URL"
                className="mt-1 w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2 text-sm outline-none focus:border-[#315d7a]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5e6873]">Description / Key Metrics</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Certificate scope, completion status, engineering quality remarks, or issuing engineer authority note."
                rows={3}
                className="mt-1 w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2 text-sm outline-none focus:border-[#315d7a]"
              />
            </div>

            <div className="flex flex-wrap gap-6 pt-2">
              <label className="flex items-center gap-2 text-sm text-[#17212b]">
                <input
                  type="checkbox"
                  checked={form.verified}
                  onChange={(e) => setForm({ ...form, verified: e.target.checked })}
                  className="h-4 w-4"
                />
                Verified by Company Administration
              </label>

              <label className="flex items-center gap-2 text-sm text-[#17212b]">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="h-4 w-4"
                />
                Active
              </label>
            </div>

            <div className="flex gap-3 pt-3">
              <button
                onClick={handleSave}
                disabled={saving || !form.title.trim()}
                className="flex items-center gap-2 bg-[#315d7a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#264a63] disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editingId ? 'Update Certificate' : 'Save Certificate'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="border border-[#d9dee4] bg-white px-4 py-2.5 text-sm font-medium text-[#5e6873] hover:bg-[#f1f3f5]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#9aa3ab]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search certificates..."
            className="w-full border border-[#d9dee4] bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#315d7a]"
          />
        </div>
        <span className="text-xs text-[#5e6873]">
          Total: {filteredItems.length} certificate{filteredItems.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="border border-[#e7ebef] bg-white px-4 py-12 text-center">
            <Award className="mx-auto h-8 w-8 text-[#9aa3ab]" />
            <p className="mt-3 text-sm font-medium text-[#17212b]">No performance certificates configured</p>
            <p className="mt-1 text-xs text-[#5e6873]">
              {search ? 'Try adjusting your search query.' : 'Record verified client performance certificates and completion evaluations.'}
            </p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-start justify-between gap-4 border border-[#e7ebef] bg-white p-5 shadow-sm transition hover:border-[#d9dee4]"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-[#17212b]">{item.title}</p>
                  <button
                    onClick={() => handleToggleVerified(item)}
                    title={item.verified ? 'Click to mark unverified' : 'Click to mark verified'}
                    className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      item.verified
                        ? 'bg-[#3d7a5a]/10 text-[#3d7a5a]'
                        : 'bg-[#c58a2a]/10 text-[#c58a2a]'
                    }`}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    {item.verified ? 'Verified' : 'Pending Verification'}
                  </button>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      item.active ? 'bg-[#315d7a]/10 text-[#315d7a]' : 'bg-[#9aa3ab]/20 text-[#5e6873]'
                    }`}
                  >
                    {item.active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="mt-2 space-y-1 text-xs text-[#5e6873]">
                  {item.project && (
                    <p>
                      <span className="font-medium text-[#17212b]">Project:</span> {item.project.title}
                    </p>
                  )}
                  {item.issuedBy && (
                    <p>
                      <span className="font-medium text-[#17212b]">Issued By:</span> {item.issuedBy.name}{' '}
                      {item.issuedBy.shortName ? `(${item.issuedBy.shortName})` : ''}
                    </p>
                  )}
                  {item.issueDate && (
                    <p>
                      <span className="font-medium text-[#17212b]">Issue Date:</span>{' '}
                      {new Date(item.issueDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  )}
                  {item.description && (
                    <p className="mt-2 max-w-2xl text-[#8b969f] leading-5">{item.description}</p>
                  )}
                </div>

                {item.documentUrl && (
                  <div className="mt-3">
                    <a
                      href={item.documentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#315d7a] hover:underline"
                    >
                      <FileText className="h-3.5 w-3.5" /> View Secure Document Reference <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEdit(item)}
                  className="rounded p-1.5 text-[#5e6873] transition hover:bg-[#f1f3f5] hover:text-[#17212b]"
                  aria-label="Edit certificate"
                  title="Edit certificate"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="rounded p-1.5 text-[#5e6873] transition hover:bg-red-50 hover:text-red-600"
                  aria-label="Delete certificate"
                  title="Delete certificate"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
