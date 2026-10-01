'use client'

import { useEffect, useState } from 'react'
import { Plus, Save, Trash2, Loader2, X } from 'lucide-react'
import { USER_ROLES } from '@/lib/constants'

interface AdminUser {
  id: string
  email: string
  name: string
  role: string
  active: boolean
  lastLoginAt: string | null
  createdAt: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ email: '', name: '', password: '', role: 'EDITOR' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const res = await fetch('/api/users')
    const data = await res.json()
    if (res.status === 403) setForbidden(true)
    else if (data.success) setUsers(data.data)
    setLoading(false)
  }

  async function handleCreate() {
    setSaving(true)
    setMessage('')
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (data.success) {
      setShowForm(false)
      setForm({ email: '', name: '', password: '', role: 'EDITOR' })
      load()
    } else {
      setMessage(data.error?.message || 'Failed to create user.')
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this user?')) return
    await fetch(`/api/users/${id}`, { method: 'DELETE' })
    load()
  }

  async function toggleActive(user: AdminUser) {
    await fetch(`/api/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !user.active }),
    })
    load()
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-[#5e6873]" /></div>

  if (forbidden) {
    return (
      <div className="border border-[#e7ebef] bg-white p-8 text-center">
        <h1 className="text-xl font-semibold text-[#17212b]">Users</h1>
        <p className="mt-2 text-sm text-[#5e6873]">Only SUPER_ADMIN can manage users.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#17212b]">Users</h1>
          <p className="mt-1 text-sm text-[#5e6873]">{users.length} admin accounts</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-[#315d7a] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#264a63]">
          <Plus className="h-4 w-4" /> Add User
        </button>
      </div>

      {showForm && (
        <div className="mb-4 border border-[#315d7a] bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#315d7a]">New Admin User</h2>
            <button onClick={() => setShowForm(false)} aria-label="Close"><X className="h-4 w-4 text-[#5e6873]" /></button>
          </div>
          {message && <div className="mb-3 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{message}</div>}
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name *" className="border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2.5 text-sm outline-none focus:border-[#315d7a]" />
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email *" className="border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2.5 text-sm outline-none focus:border-[#315d7a]" />
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password (min 8) *" className="border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2.5 text-sm outline-none focus:border-[#315d7a]" />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2.5 text-sm outline-none focus:border-[#315d7a]">
              {USER_ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
            </select>
          </div>
          <button onClick={handleCreate} disabled={saving} className="mt-4 flex items-center gap-2 bg-[#315d7a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Create
          </button>
        </div>
      )}

      <div className="overflow-x-auto border border-[#e7ebef] bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-[#e7ebef] bg-[#f7f8fa] text-xs uppercase tracking-wider text-[#5e6873]">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-[#e7ebef]">
                <td className="px-4 py-3">
                  <p className="font-medium text-[#17212b]">{user.name}</p>
                  <p className="text-xs text-[#5e6873]">{user.email}</p>
                </td>
                <td className="px-4 py-3 text-[#5e6873]">{user.role.replace('_', ' ')}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActive(user)} className={`text-xs font-semibold ${user.active ? 'text-[#3d7a5a]' : 'text-[#b84a4a]'}`}>
                    {user.active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleDelete(user.id)} className="rounded p-1.5 text-[#5e6873] hover:bg-red-50 hover:text-red-600" aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
