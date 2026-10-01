'use client'

import { useEffect, useState } from 'react'
import { Plus, Save, Trash2, Loader2, Pencil, X, Users, Search, CheckCircle2, XCircle } from 'lucide-react'

interface TeamMember {
  id: string
  name: string
  title: string | null
  department: string | null
  bio: string | null
  photoUrl: string | null
  email: string | null
  phone: string | null
  displayOrder: number
  active: boolean
  createdAt: string
}

const emptyForm = {
  name: '',
  title: '',
  department: '',
  bio: '',
  photoUrl: '',
  email: '',
  phone: '',
  displayOrder: 0,
  active: true,
}

export default function AdminTeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([])
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
      const res = await fetch('/api/team')
      const data = await res.json()
      if (data.success) {
        setMembers(data.data)
      }
    } catch {
      setMessage('Failed to load team members.')
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

  function openEdit(member: TeamMember) {
    setEditingId(member.id)
    setForm({
      name: member.name,
      title: member.title || '',
      department: member.department || '',
      bio: member.bio || '',
      photoUrl: member.photoUrl || '',
      email: member.email || '',
      phone: member.phone || '',
      displayOrder: member.displayOrder,
      active: member.active,
    })
    setMessage('')
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    setMessage('')
    const url = editingId ? `/api/team/${editingId}` : '/api/team'
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
        setMessage(editingId ? 'Team member updated successfully.' : 'Team member added successfully.')
        load()
      } else {
        setMessage(result.error?.message || 'Failed to save team member.')
      }
    } catch {
      setMessage('Network error. Failed to save team member.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this team member record?')) return
    try {
      const res = await fetch(`/api/team/${id}`, { method: 'DELETE' })
      const result = await res.json()
      if (result.success) {
        setMessage('Team member deleted successfully.')
        load()
      } else {
        setMessage(result.error?.message || 'Failed to delete team member.')
      }
    } catch {
      setMessage('Network error. Failed to delete.')
    }
  }

  async function handleToggleActive(member: TeamMember) {
    try {
      const res = await fetch(`/api/team/${member.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !member.active }),
      })
      const result = await res.json()
      if (result.success) {
        setMembers((prev) =>
          prev.map((m) => (m.id === member.id ? { ...m, active: !m.active } : m)),
        )
      }
    } catch {
      setMessage('Failed to toggle status.')
    }
  }

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.title && m.title.toLowerCase().includes(search.toLowerCase())) ||
      (m.department && m.department.toLowerCase().includes(search.toLowerCase())),
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
          <h1 className="text-2xl font-semibold text-[#17212b]">Team & Key Personnel</h1>
          <p className="mt-1 text-sm text-[#5e6873]">
            Manage leadership and engineering team profiles. Only active members appear on the public website.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[#315d7a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#264a63]"
        >
          <Plus className="h-4 w-4" /> Add Team Member
        </button>
      </div>

      {message && (
        <div
          className={`mb-4 border px-4 py-3 text-sm ${
            message.includes('success')
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {message}
        </div>
      )}

      {/* Form Drawer / Card */}
      {showForm && (
        <div className="mb-6 border border-[#315d7a] bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between border-b border-[#e7ebef] pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#315d7a]">
              {editingId ? 'Edit Team Member' : 'New Team Member'}
            </h2>
            <button onClick={() => setShowForm(false)} aria-label="Close form">
              <X className="h-4 w-4 text-[#5e6873]" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-[#5e6873]">Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Engr. Muhammad ..."
                  className="mt-1 w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2 text-sm outline-none focus:border-[#315d7a]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5e6873]">Title / Designation</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Project Director / Chief Engineer"
                  className="mt-1 w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2 text-sm outline-none focus:border-[#315d7a]"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-[#5e6873]">Department</label>
                <input
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  placeholder="e.g. Civil Engineering / Operations"
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
              <label className="block text-xs font-semibold text-[#5e6873]">Professional Background & Bio</label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Professional qualification, PEC registration reference, or key project execution background."
                rows={3}
                className="mt-1 w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2 text-sm outline-none focus:border-[#315d7a]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5e6873]">Photo URL (optional)</label>
              <input
                value={form.photoUrl}
                onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
                placeholder="https://... or /uploads/images/..."
                className="mt-1 w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2 text-sm outline-none focus:border-[#315d7a]"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 border-t border-[#f1f3f5] pt-3">
              <div>
                <label className="block text-xs font-semibold text-[#5e6873]">Email (Internal Record)</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="Official contact email"
                  className="mt-1 w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2 text-sm outline-none focus:border-[#315d7a]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5e6873]">Phone (Internal Record)</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Contact phone"
                  className="mt-1 w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2 text-sm outline-none focus:border-[#315d7a]"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <label className="flex items-center gap-2 text-sm text-[#17212b]">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="h-4 w-4"
                />
                Active (display on public website)
              </label>
            </div>

            <div className="flex gap-3 pt-3">
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="flex items-center gap-2 bg-[#315d7a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#264a63] disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editingId ? 'Update Member' : 'Save Member'}
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
            placeholder="Search by name, title, or department..."
            className="w-full border border-[#d9dee4] bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#315d7a]"
          />
        </div>
        <span className="text-xs text-[#5e6873]">
          Total: {filteredMembers.length} member{filteredMembers.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Members List */}
      <div className="space-y-3">
        {filteredMembers.length === 0 ? (
          <div className="border border-[#e7ebef] bg-white px-4 py-12 text-center">
            <Users className="mx-auto h-8 w-8 text-[#9aa3ab]" />
            <p className="mt-3 text-sm font-medium text-[#17212b]">No team members found</p>
            <p className="mt-1 text-xs text-[#5e6873]">
              {search ? 'Try adjusting your search query.' : 'Add key engineering personnel and management.'}
            </p>
          </div>
        ) : (
          filteredMembers.map((member) => (
            <div
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-4 border border-[#e7ebef] bg-white p-4 shadow-sm transition hover:border-[#d9dee4]"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded bg-[#edf3f5] text-xs font-bold text-[#315d7a]">
                  {member.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={member.photoUrl} alt={member.name} className="h-full w-full object-cover" />
                  ) : (
                    member.name.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[#17212b]">{member.name}</p>
                    <button
                      onClick={() => handleToggleActive(member)}
                      title={member.active ? 'Click to deactivate' : 'Click to activate'}
                      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        member.active
                          ? 'bg-[#3d7a5a]/10 text-[#3d7a5a]'
                          : 'bg-[#9aa3ab]/20 text-[#5e6873]'
                      }`}
                    >
                      {member.active ? (
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
                  <p className="mt-0.5 text-xs text-[#5e6873]">
                    {member.title || 'Title not set'}
                    {member.department ? ` · ${member.department}` : ''}
                    {member.displayOrder > 0 ? ` · Order: ${member.displayOrder}` : ''}
                  </p>
                  {member.bio && (
                    <p className="mt-1.5 line-clamp-1 max-w-xl text-xs text-[#8b969f]">{member.bio}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEdit(member)}
                  className="rounded p-1.5 text-[#5e6873] transition hover:bg-[#f1f3f5] hover:text-[#17212b]"
                  aria-label="Edit member"
                  title="Edit member"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(member.id)}
                  className="rounded p-1.5 text-[#5e6873] transition hover:bg-red-50 hover:text-red-600"
                  aria-label="Delete member"
                  title="Delete member"
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
