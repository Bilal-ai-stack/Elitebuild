'use client'

import { useEffect, useState } from 'react'
import { Plus, Save, Trash2, Loader2, Pencil, X } from 'lucide-react'

interface Capability {
  id: string
  title: string
  description: string | null
  active: boolean
  featured: boolean
  displayOrder: number
}

const emptyForm = { title: '', description: '', featured: false, active: true, displayOrder: 0 }

export default function AdminCapabilitiesPage() {
  const [items, setItems] = useState<Capability[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const res = await fetch('/api/capabilities')
    const data = await res.json()
    if (data.success) setItems(data.data)
    setLoading(false)
  }

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  function openEdit(item: Capability) {
    setEditingId(item.id)
    setForm({
      title: item.title,
      description: item.description || '',
      featured: item.featured,
      active: item.active,
      displayOrder: item.displayOrder,
    })
    setShowForm(true)
  }

  async function handleSave() {
    setSaving(true)
    const url = editingId ? `/api/capabilities/${editingId}` : '/api/capabilities'
    const method = editingId ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if ((await res.json()).success) {
      setShowForm(false)
      load()
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this capability?')) return
    await fetch(`/api/capabilities/${id}`, { method: 'DELETE' })
    load()
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-[#5e6873]" /></div>

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#17212b]">Capabilities</h1>
          <p className="mt-1 text-sm text-[#5e6873]">{items.length} capabilities — only add verified positioning</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-[#315d7a] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#264a63]">
          <Plus className="h-4 w-4" /> Add Capability
        </button>
      </div>

      {showForm && (
        <div className="mb-4 border border-[#315d7a] bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#315d7a]">{editingId ? 'Edit' : 'New'} Capability</h2>
            <button onClick={() => setShowForm(false)} aria-label="Close"><X className="h-4 w-4 text-[#5e6873]" /></button>
          </div>
          <div className="space-y-3">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title *" className="w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2.5 text-sm outline-none focus:border-[#315d7a]" />
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" rows={3} className="w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2.5 text-sm outline-none focus:border-[#315d7a]" />
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Featured</label>
            </div>
            <button onClick={handleSave} disabled={saving || !form.title} className="flex items-center gap-2 bg-[#315d7a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="border border-[#e7ebef] bg-white px-4 py-10 text-center text-sm text-[#5e6873]">No capabilities configured yet.</div>
        ) : items.map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-4 border border-[#e7ebef] bg-white px-4 py-4">
            <div>
              <p className="font-medium text-[#17212b]">{item.title}</p>
              {item.description && <p className="mt-1 text-sm text-[#5e6873]">{item.description}</p>}
              <p className="mt-2 text-xs text-[#9aa3ab]">{item.active ? 'Active' : 'Inactive'}{item.featured ? ' · Featured' : ''}</p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => openEdit(item)} className="rounded p-1.5 text-[#5e6873] hover:bg-[#f1f3f5]" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => handleDelete(item.id)} className="rounded p-1.5 text-[#5e6873] hover:bg-red-50 hover:text-red-600" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
