'use client'

import { useEffect, useState } from 'react'
import { Plus, Save, Trash2, Loader2, Pencil, X, Building2, Search, CheckCircle2, XCircle, ExternalLink } from 'lucide-react'

interface ClientOrg {
  id: string
  name: string
  shortName: string | null
  description: string | null
  logoUrl: string | null
  website: string | null
  displayOrder: number
  active: boolean
  createdAt: string
  _count?: {
    certificates: number
  }
}

const emptyForm = {
  name: '',
  shortName: '',
  description: '',
  logoUrl: '',
  website: '',
  displayOrder: 0,
  active: true,
}

export default function AdminClientOrganizationsPage() {
  const [items, setItems] = useState<ClientOrg[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/client-organizations')
      const data = await res.json()
      if (data.success) {
        setItems(data.data)
      }
    } catch {
      setMessage('Failed to load client organizations.')
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setMessage('')
    setShowForm(true)
  }

  function openEdit(item: ClientOrg) {
    setEditingId(item.id)
    setForm({
      name: item.name,
      shortName: item.shortName || '',
      description: item.description || '',
      logoUrl: item.logoUrl || '',
      website: item.website || '',
      displayOrder: item.displayOrder,
      active: item.active,
    })
    setMessage('')
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    setMessage('')
    const url = editingId ? `/api/client-organizations/${editingId}` : '/api/client-organizations'
    const method = editingId ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const result = await res.json()
      if (result.success) {
        setShowForm(false)
        setMessage(editingId ? 'Client organization updated.' : 'Client organization added.')
        load()
      } else {
        setMessage(result.error?.message || 'Failed to save organization.')
      }
    } catch {
      setMessage('Network error. Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(item: ClientOrg) {
    if (item._count && item._count.certificates > 0) {
      alert(`Cannot delete "${item.name}" because it is linked to ${item._count.certificates} performance certificate(s). Please deactivate it instead.`)
      return
    }

    if (!confirm(`Are you sure you want to delete "${item.name}"? This action cannot be undone.`)) return

    try {
      const res = await fetch(`/api/client-organizations/${item.id}`, { method: 'DELETE' })
      const result = await res.json()
      if (result.success) {
        setMessage('Client organization deleted successfully.')
        load()
      } else {
        setMessage(result.error?.message || 'Failed to delete organization.')
      }
    } catch {
      setMessage('Network error. Failed to delete.')
    }
  }

  async function handleToggleActive(item: ClientOrg) {
    try {
      const res = await fetch(`/api/client-organizations/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !item.active }),
      })
      const result = await res.json()
      if (result.success) {
        setItems((prev) =>
          prev.map((o) => (o.id === item.id ? { ...o, active: !o.active } : o)),
        )
      }
    } catch {
      setMessage('Failed to toggle status.')
    }
  }

  const filteredItems = items.filter(
    (o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      (o.shortName && o.shortName.toLowerCase().includes(search.toLowerCase())),
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
          <h1 className="text-2xl font-semibold text-[#17212b]">Client Organizations</h1>
          <p className="mt-1 text-sm text-[#5e6873]">
            Maintain public-sector departments, autonomous bodies, and client authorities associated with contracts.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[#315d7a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#264a63]"
        >
          <Plus className="h-4 w-4" /> Add Organization
        </button>
      </div>

      {message && (
        <div
          className={`mb-4 border px-4 py-3 text-sm ${
            message.includes('success') || message.includes('updated') || message.includes('added')
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
              {editingId ? 'Edit Organization' : 'New Organization'}
            </h2>
            <button onClick={() => setShowForm(false)} aria-label="Close form">
              <X className="h-4 w-4 text-[#5e6873]" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-[#5e6873]">Full Organization Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Communication & Works Department, KP"
                  className="mt-1 w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2 text-sm outline-none focus:border-[#315d7a]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5e6873]">Short Name / Acronym</label>
                <input
                  value={form.shortName}
                  onChange={(e) => setForm({ ...form, shortName: e.target.value })}
                  placeholder="e.g. C&W KP, NHA, MES"
                  className="mt-1 w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2 text-sm outline-none focus:border-[#315d7a]"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-[#5e6873]">Official Website URL</label>
                <input
                  type="url"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  placeholder="https://..."
                  className="mt-1 w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2 text-sm outline-none focus:border-[#315d7a]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5e6873]">Display Order</label>
                <input
                  type="number"
                  value={form.displayOrder}
                  onChange={(e) => setForm({ ...form, displayOrder: parseInt(e.target.value) || 0 })}
                  className="mt-1 w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2 text-sm outline-none focus:border-[#315d7a]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5e6873]">Logo URL (optional)</label>
              <input
                value={form.logoUrl}
                onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                placeholder="https://... or /uploads/images/..."
                className="mt-1 w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2 text-sm outline-none focus:border-[#315d7a]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5e6873]">Description / Scope of Collaboration</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Details of civil works, client mandate, or project types awarded."
                rows={3}
                className="mt-1 w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2 text-sm outline-none focus:border-[#315d7a]"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <label className="flex items-center gap-2 text-sm text-[#17212b]">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="h-4 w-4"
                />
                Active (available for projects and public reference)
              </label>
            </div>

            <div className="flex gap-3 pt-3">
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="flex items-center gap-2 bg-[#315d7a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#264a63] disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editingId ? 'Update Organization' : 'Save Organization'}
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
            placeholder="Search organizations..."
            className="w-full border border-[#d9dee4] bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#315d7a]"
          />
        </div>
        <span className="text-xs text-[#5e6873]">
          Total: {filteredItems.length} organization{filteredItems.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="border border-[#e7ebef] bg-white px-4 py-12 text-center">
            <Building2 className="mx-auto h-8 w-8 text-[#9aa3ab]" />
            <p className="mt-3 text-sm font-medium text-[#17212b]">No client organizations configured</p>
            <p className="mt-1 text-xs text-[#5e6873]">
              {search ? 'Try adjusting your search query.' : 'Add client organizations and tendering authorities.'}
            </p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-4 border border-[#e7ebef] bg-white p-4 shadow-sm transition hover:border-[#d9dee4]"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded bg-[#edf3f5] text-xs font-bold text-[#315d7a]">
                  {item.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.logoUrl} alt={item.name} className="h-full w-full object-contain p-1" />
                  ) : (
                    <Building2 className="h-5 w-5 text-[#315d7a]" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[#17212b]">{item.name}</p>
                    {item.shortName && (
                      <span className="rounded bg-[#f1f3f5] px-2 py-0.5 text-xs font-medium text-[#5e6873]">
                        {item.shortName}
                      </span>
                    )}
                    <button
                      onClick={() => handleToggleActive(item)}
                      title={item.active ? 'Click to deactivate' : 'Click to activate'}
                      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        item.active
                          ? 'bg-[#3d7a5a]/10 text-[#3d7a5a]'
                          : 'bg-[#9aa3ab]/20 text-[#5e6873]'
                      }`}
                    >
                      {item.active ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3" /> Inactive
                        </>
                      )}
                    </button>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#5e6873]">
                    {item.website && (
                      <a
                        href={item.website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[#315d7a] hover:underline"
                      >
                        Official Website <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {item._count && item._count.certificates > 0 && (
                      <span className="text-[#c58a2a] font-medium">
                        {item._count.certificates} linked certificate{item._count.certificates === 1 ? '' : 's'}
                      </span>
                    )}
                    {item.displayOrder > 0 && <span>Order: {item.displayOrder}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEdit(item)}
                  className="rounded p-1.5 text-[#5e6873] transition hover:bg-[#f1f3f5] hover:text-[#17212b]"
                  aria-label="Edit organization"
                  title="Edit organization"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(item)}
                  className="rounded p-1.5 text-[#5e6873] transition hover:bg-red-50 hover:text-red-600"
                  aria-label="Delete organization"
                  title="Delete organization"
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
