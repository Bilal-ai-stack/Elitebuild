'use client'

import { useEffect, useState } from 'react'
import { Plus, Save, Trash2, Loader2, Pencil, X } from 'lucide-react'
import { EQUIPMENT_CATEGORIES } from '@/lib/constants'

interface EquipmentItem {
  id: string
  name: string
  category: string | null
  description: string | null
  quantity: number | null
  status: string | null
  active: boolean
  displayOrder: number
}

const emptyForm = {
  name: '',
  category: '',
  description: '',
  quantity: '' as string | number,
  status: 'AVAILABLE',
  active: true,
  displayOrder: 0,
}

export default function AdminEquipmentPage() {
  const [items, setItems] = useState<EquipmentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const res = await fetch('/api/equipment')
    const data = await res.json()
    if (data.success) setItems(data.data)
    setLoading(false)
  }

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  function openEdit(item: EquipmentItem) {
    setEditingId(item.id)
    setForm({
      name: item.name,
      category: item.category || '',
      description: item.description || '',
      quantity: item.quantity ?? '',
      status: item.status || 'AVAILABLE',
      active: item.active,
      displayOrder: item.displayOrder,
    })
    setShowForm(true)
  }

  async function handleSave() {
    setSaving(true)
    const payload = {
      ...form,
      quantity: form.quantity === '' ? null : Number(form.quantity),
      category: form.category || undefined,
    }
    const url = editingId ? `/api/equipment/${editingId}` : '/api/equipment'
    const method = editingId ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if ((await res.json()).success) {
      setShowForm(false)
      load()
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this equipment record?')) return
    await fetch(`/api/equipment/${id}`, { method: 'DELETE' })
    load()
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-[#5e6873]" /></div>

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#17212b]">Equipment</h1>
          <p className="mt-1 text-sm text-[#5e6873]">Leave quantity empty when unknown — never invent quantities</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-[#315d7a] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#264a63]">
          <Plus className="h-4 w-4" /> Add Equipment
        </button>
      </div>

      {showForm && (
        <div className="mb-4 border border-[#315d7a] bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#315d7a]">{editingId ? 'Edit' : 'New'} Equipment</h2>
            <button onClick={() => setShowForm(false)} aria-label="Close"><X className="h-4 w-4 text-[#5e6873]" /></button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name *" className="border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2.5 text-sm outline-none focus:border-[#315d7a] sm:col-span-2" />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2.5 text-sm outline-none focus:border-[#315d7a]">
              <option value="">Category (optional)</option>
              {EQUIPMENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="number" min={0} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="Quantity (leave empty if unknown)" className="border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2.5 text-sm outline-none focus:border-[#315d7a]" />
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" rows={3} className="border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2.5 text-sm outline-none focus:border-[#315d7a] sm:col-span-2" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active</label>
          </div>
          <button onClick={handleSave} disabled={saving || !form.name} className="mt-4 flex items-center gap-2 bg-[#315d7a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
          </button>
        </div>
      )}

      <div className="overflow-x-auto border border-[#e7ebef] bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-[#e7ebef] bg-[#f7f8fa] text-xs uppercase tracking-wider text-[#5e6873]">
            <tr>
              <th className="px-4 py-3">Equipment</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Quantity</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-[#5e6873]">No equipment records yet.</td></tr>
            ) : items.map((item) => (
              <tr key={item.id} className="border-b border-[#e7ebef]">
                <td className="px-4 py-3 font-medium text-[#17212b]">{item.name}</td>
                <td className="px-4 py-3 text-[#5e6873]">{item.category || '—'}</td>
                <td className="px-4 py-3 text-[#5e6873]">{item.quantity ?? 'Not configured'}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openEdit(item)} className="rounded p-1.5 text-[#5e6873] hover:bg-[#f1f3f5]" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(item.id)} className="rounded p-1.5 text-[#5e6873] hover:bg-red-50 hover:text-red-600" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
