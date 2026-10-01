'use client'

import { useEffect, useState } from 'react'
import { Plus, Save, Trash2, Loader2, Pencil, X } from 'lucide-react'
import Link from 'next/link'

interface Service {
  id: string
  name: string
  slug: string
  shortDescription: string | null
  active: boolean
  featured: boolean
  displayOrder: number
}

const emptyForm = {
  name: '',
  slug: '',
  shortDescription: '',
  description: '',
  featured: false,
  active: true,
  displayOrder: 0,
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => { fetchServices() }, [])

  async function fetchServices() {
    setLoading(true)
    const res = await fetch('/api/services')
    const data = await res.json()
    if (data.success) {
      setServices(data.data.services || data.data || [])
    }
    setLoading(false)
  }

  function generateSlug(name: string) {
    return name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-')
  }

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
    setMessage('')
  }

  function openEdit(service: Service & { description?: string | null }) {
    setEditingId(service.id)
    setForm({
      name: service.name,
      slug: service.slug,
      shortDescription: service.shortDescription || '',
      description: (service as { description?: string }).description || '',
      featured: service.featured,
      active: service.active,
      displayOrder: service.displayOrder,
    })
    setShowForm(true)
    setMessage('')
  }

  async function handleSave() {
    setSaving(true)
    setMessage('')
    const url = editingId ? `/api/services/${editingId}` : '/api/services'
    const method = editingId ? 'PUT' : 'POST'
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) {
        setShowForm(false)
        setForm(emptyForm)
        setEditingId(null)
        fetchServices()
      } else {
        setMessage(data.error?.message || 'Failed to save.')
      }
    } catch {
      setMessage('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this service?')) return
    await fetch(`/api/services/${id}`, { method: 'DELETE' })
    fetchServices()
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#17212b]">Services</h1>
          <p className="mt-1 text-sm text-[#5e6873]">{services.length} services</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[#315d7a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#264a63]"
        >
          <Plus className="h-4 w-4" /> Add Service
        </button>
      </div>

      {message && (
        <div className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>
      )}

      {showForm && (
        <div className="mb-4 border border-[#315d7a] bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#315d7a]">
              {editingId ? 'Edit Service' : 'New Service'}
            </h2>
            <button onClick={() => setShowForm(false)} aria-label="Close">
              <X className="h-4 w-4 text-[#5e6873]" />
            </button>
          </div>
          <div className="space-y-3">
            <input
              value={form.name}
              onChange={(e) => setForm({
                ...form,
                name: e.target.value,
                ...(!editingId ? { slug: generateSlug(e.target.value) } : {}),
              })}
              placeholder="Service name *"
              className="w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2.5 text-sm outline-none focus:border-[#315d7a]"
            />
            <input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="Slug *"
              className="w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2.5 text-sm outline-none focus:border-[#315d7a]"
            />
            <input
              value={form.shortDescription}
              onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
              placeholder="Short description"
              className="w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2.5 text-sm outline-none focus:border-[#315d7a]"
            />
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Full description"
              rows={4}
              className="w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2.5 text-sm outline-none focus:border-[#315d7a]"
            />
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-[#17212b]">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm text-[#17212b]">
                <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
                Featured
              </label>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving || !form.name || !form.slug}
                className="flex items-center gap-2 bg-[#315d7a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-[#5e6873]">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto border border-[#e7ebef] bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-[#e7ebef] bg-[#f7f8fa] text-xs uppercase tracking-wider text-[#5e6873]">
            <tr>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Featured</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {services.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-[#5e6873]">
                  No services yet. Add verified services from the admin panel.
                </td>
              </tr>
            ) : (
              services.map((service) => (
                <tr key={service.id} className="border-b border-[#e7ebef]">
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#17212b]">{service.name}</p>
                    <p className="text-xs text-[#5e6873]">/{service.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold ${service.active ? 'text-[#3d7a5a]' : 'text-[#5e6873]'}`}>
                      {service.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#5e6873]">{service.featured ? 'Yes' : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(service)} className="rounded p-1.5 text-[#5e6873] hover:bg-[#f1f3f5]" aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <Link href={`/services/${service.slug}`} className="rounded p-1.5 text-[#5e6873] hover:bg-[#f1f3f5] text-xs px-2 py-1.5">
                        View
                      </Link>
                      <button onClick={() => handleDelete(service.id)} className="rounded p-1.5 text-[#5e6873] hover:bg-red-50 hover:text-red-600" aria-label="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
