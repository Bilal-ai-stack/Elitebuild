'use client'

import { useEffect, useState } from 'react'
import { Plus, Save, Trash2, Loader2, Pencil, X } from 'lucide-react'

interface FAQ {
  id: string
  question: string
  answer: string
  category: string | null
  displayOrder: number
  active: boolean
  public: boolean
}

const emptyForm = {
  question: '',
  answer: '',
  category: '',
  displayOrder: 0,
  active: true,
  public: true,
}

export default function AdminFAQsPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchFAQs()
  }, [])

  async function fetchFAQs() {
    setLoading(true)
    try {
      const res = await fetch('/api/faqs')
      const data = await res.json()
      if (data.success) {
        setFaqs(data.data.faqs || data.data || [])
      }
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
    setMessage('')
  }

  function openEdit(faq: FAQ) {
    setEditingId(faq.id)
    setForm({
      question: faq.question,
      answer: faq.answer,
      category: faq.category || '',
      displayOrder: faq.displayOrder,
      active: faq.active,
      public: faq.public,
    })
    setShowForm(true)
    setMessage('')
  }

  async function handleSave() {
    if (!form.question.trim() || !form.answer.trim()) {
      setMessage('Question and answer are required.')
      return
    }

    setSaving(true)
    setMessage('')
    const url = editingId ? `/api/faqs/${editingId}` : '/api/faqs'
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
        fetchFAQs()
      } else {
        setMessage(data.error?.message || 'Failed to save FAQ.')
      }
    } catch {
      setMessage('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this FAQ?')) return
    const res = await fetch(`/api/faqs/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) {
      fetchFAQs()
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#17212b]">FAQs</h1>
          <p className="mt-1 text-sm text-[#5e6873]">{faqs.length} questions</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[#315d7a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#264a63]"
        >
          <Plus className="h-4 w-4" /> Add FAQ
        </button>
      </div>

      {/* Form Drawer / Panel */}
      {showForm && (
        <div className="mb-6 border border-[#315d7a] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#315d7a]">
              {editingId ? 'Edit FAQ' : 'New FAQ'}
            </h2>
            <button
              onClick={() => setShowForm(false)}
              className="text-[#5e6873] hover:text-[#17212b]"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {message && (
            <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">
              {message}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#5e6873]">Question *</label>
              <input
                value={form.question}
                onChange={(e) => setForm({ ...form, question: e.target.value })}
                placeholder="Frequently asked question..."
                className="w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2.5 text-sm outline-none focus:border-[#315d7a]"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[#5e6873]">Answer *</label>
              <textarea
                value={form.answer}
                onChange={(e) => setForm({ ...form, answer: e.target.value })}
                placeholder="Detailed answer..."
                rows={4}
                className="w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2.5 text-sm outline-none focus:border-[#315d7a]"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#5e6873]">Category (optional)</label>
                <input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="e.g. General, Construction, Bidding"
                  className="w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2.5 text-sm outline-none focus:border-[#315d7a]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#5e6873]">Display Order</label>
                <input
                  type="number"
                  value={form.displayOrder}
                  onChange={(e) => setForm({ ...form, displayOrder: parseInt(e.target.value, 10) || 0 })}
                  className="w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2.5 text-sm outline-none focus:border-[#315d7a]"
                />
              </div>
            </div>

            <div className="flex gap-6 pt-2">
              <label className="flex items-center gap-2 text-sm text-[#17212b]">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="h-4 w-4"
                />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm text-[#17212b]">
                <input
                  type="checkbox"
                  checked={form.public}
                  onChange={(e) => setForm({ ...form, public: e.target.checked })}
                  className="h-4 w-4"
                />
                Public (Show on Website)
              </label>
            </div>

            <div className="flex gap-3 pt-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-[#315d7a] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#264a63] disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editingId ? 'Update FAQ' : 'Save FAQ'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="border border-[#d9dee4] px-4 py-2 text-sm font-medium text-[#5e6873] hover:bg-[#f7f8fa]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAQ List */}
      <div className="space-y-3">
        {faqs.length === 0 ? (
          <div className="border border-[#e7ebef] bg-white p-8 text-center text-sm text-[#5e6873]">
            No FAQs yet. Add the first question.
          </div>
        ) : (
          faqs.map((faq) => (
            <div key={faq.id} className="border border-[#e7ebef] bg-white transition hover:shadow-sm">
              <div className="flex items-start justify-between p-4">
                <div className="flex-1 pr-4">
                  <p className="font-medium text-[#17212b]">{faq.question}</p>
                  <p className="mt-1 text-sm text-[#5e6873] whitespace-pre-wrap">{faq.answer}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    {faq.category && (
                      <span className="bg-[#f1f3f5] px-2 py-0.5 font-medium text-[#5e6873]">
                        {faq.category}
                      </span>
                    )}
                    <span
                      className={`inline-block px-2 py-0.5 font-medium ${
                        faq.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {faq.active ? 'Active' : 'Inactive'}
                    </span>
                    <span
                      className={`inline-block px-2 py-0.5 font-medium ${
                        faq.public ? 'bg-blue-50 text-[#315d7a]' : 'bg-gray-100 text-[#9aa3ab]'
                      }`}
                    >
                      {faq.public ? 'Public' : 'Internal Only'}
                    </span>
                    <span className="text-[#9aa3ab]">Order: {faq.displayOrder}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(faq)}
                    className="rounded p-1.5 text-[#5e6873] transition hover:bg-[#f7f8fa] hover:text-[#17212b]"
                    title="Edit FAQ"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(faq.id)}
                    className="rounded p-1.5 text-[#5e6873] transition hover:bg-red-50 hover:text-red-600"
                    title="Delete FAQ"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
