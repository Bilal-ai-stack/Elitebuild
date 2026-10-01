'use client'

import { useEffect, useState } from 'react'
import { MessageSquare, Mail, Phone, Clock, Search, Loader2 } from 'lucide-react'

interface Inquiry {
  id: string
  name: string
  organization: string | null
  email: string
  phone: string | null
  whatsapp: string | null
  subject: string | null
  message: string
  projectType: string | null
  status: string
  createdAt: string
}

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-amber-50 text-amber-700',
  READ: 'bg-blue-50 text-blue-700',
  IN_PROGRESS: 'bg-indigo-50 text-indigo-700',
  RESPONDED: 'bg-green-50 text-green-700',
  CLOSED: 'bg-gray-50 text-gray-600',
  SPAM: 'bg-red-50 text-red-600',
}

const STATUS_OPTIONS = ['NEW', 'READ', 'IN_PROGRESS', 'RESPONDED', 'CLOSED', 'SPAM']

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Inquiry | null>(null)

  useEffect(() => { fetchInquiries() }, [page, search, statusFilter])

  async function fetchInquiries() {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), pageSize: '20', search })
    if (statusFilter) params.set('status', statusFilter)
    const res = await fetch(`/api/inquiries?${params}`)
    const data = await res.json()
    if (data.success) {
      setInquiries(data.data.inquiries)
      setTotal(data.data.total)
    }
    setLoading(false)
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/inquiries/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    fetchInquiries()
    if (selected?.id === id) setSelected({ ...selected, status })
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#17212b]">Contact Inquiries</h1>
        <p className="mt-1 text-sm text-[#5e6873]">{total} inquiries total</p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-1 items-center gap-2 border border-[#d9dee4] bg-white px-3 py-2">
          <Search className="h-4 w-4 text-[#5e6873]" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Search by name, email, organization..." className="flex-1 bg-transparent text-sm outline-none" />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }} className="border border-[#d9dee4] bg-white px-3 py-2 text-sm outline-none">
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* List */}
        <div className="flex-1 space-y-2">
          {loading ? (
            <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-[#5e6873]" /></div>
          ) : inquiries.length === 0 ? (
            <div className="border border-[#e7ebef] bg-white p-8 text-center text-sm text-[#5e6873]">No inquiries found.</div>
          ) : (
            inquiries.map((inq) => (
              <button key={inq.id} onClick={() => { setSelected(inq); if (inq.status === 'NEW') updateStatus(inq.id, 'READ') }}
                className={`w-full border bg-white p-4 text-left transition hover:shadow-sm ${selected?.id === inq.id ? 'border-[#315d7a]' : 'border-[#e7ebef]'}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-[#17212b]">{inq.name}</p>
                    <p className="text-xs text-[#5e6873]">{inq.email}</p>
                  </div>
                  <span className={`rounded-sm px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[inq.status] || 'bg-gray-50 text-gray-600'}`}>
                    {inq.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-[#5e6873]">{inq.subject || 'General Inquiry'}</p>
                <p className="mt-1 text-xs text-[#9aa3ab]">{new Date(inq.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </button>
            ))
          )}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="w-full border border-[#e7ebef] bg-white p-6 lg:w-96">
            <h2 className="text-lg font-semibold text-[#17212b]">{selected.name}</h2>
            {selected.organization && <p className="text-sm text-[#5e6873]">{selected.organization}</p>}

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center gap-2 text-[#5e6873]">
                <Mail className="h-4 w-4" />
                <a href={`mailto:${selected.email}`} className="text-[#315d7a] underline">{selected.email}</a>
              </div>
              {selected.phone && (
                <div className="flex items-center gap-2 text-[#5e6873]">
                  <Phone className="h-4 w-4" />
                  <span>{selected.phone}</span>
                </div>
              )}
              {selected.whatsapp && (
                <div className="flex items-center gap-2 text-[#5e6873]">
                  <MessageSquare className="h-4 w-4" />
                  <a href={`https://wa.me/${selected.whatsapp.replace(/[^\d+]/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-[#315d7a] underline">
                    WhatsApp: {selected.whatsapp}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-2 text-[#5e6873]">
                <Clock className="h-4 w-4" />
                <span>{new Date(selected.createdAt).toLocaleString()}</span>
              </div>
            </div>

            {selected.subject && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase text-[#9aa3ab]">Subject</p>
                <p className="mt-1 text-sm text-[#17212b]">{selected.subject}</p>
              </div>
            )}

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase text-[#9aa3ab]">Message</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[#17212b]">{selected.message}</p>
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase text-[#9aa3ab]">Update Status</p>
              <select
                value={selected.status}
                onChange={(e) => updateStatus(selected.id, e.target.value)}
                className="mt-1 w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2 text-sm outline-none focus:border-[#315d7a]"
              >
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
