'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Eye, Loader2, Search } from 'lucide-react'
import Link from 'next/link'

interface Project {
  id: string
  title: string
  slug: string
  location: string | null
  status: string
  contentStatus: string
  featured: boolean
  category: { name: string; slug: string } | null
  _count: { images: number }
  updatedAt: string
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProjects()
  }, [page, search])

  async function fetchProjects() {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), pageSize: '20', search })
    const res = await fetch(`/api/projects?${params}`)
    const data = await res.json()
    if (data.success) {
      setProjects(data.data.projects)
      setTotal(data.data.total)
    }
    setLoading(false)
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete project "${title}"? This cannot be undone.`)) return
    await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    fetchProjects()
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#17212b]">Projects</h1>
          <p className="mt-1 text-sm text-[#5e6873]">{total} projects total</p>
        </div>
        <Link
          href="/admin/projects/new"
          className="flex items-center gap-2 bg-[#315d7a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#264a63]"
        >
          <Plus className="h-4 w-4" /> Create Project
        </Link>
      </div>

      {/* Search */}
      <div className="mb-4 flex items-center gap-2 border border-[#d9dee4] bg-white px-3 py-2">
        <Search className="h-4 w-4 text-[#5e6873]" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search projects..."
          className="flex-1 bg-transparent text-sm outline-none"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-[#e7ebef] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e7ebef] bg-[#f7f8fa] text-left text-xs font-semibold uppercase tracking-wider text-[#5e6873]">
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Published</th>
              <th className="px-4 py-3">Images</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-[#5e6873]"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
            ) : projects.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-[#5e6873]">No projects found. Create the first project.</td></tr>
            ) : (
              projects.map((p) => (
                <tr key={p.id} className="border-b border-[#f1f3f5] transition hover:bg-[#f7f8fa]">
                  <td className="px-4 py-3 font-medium text-[#17212b]">{p.title}</td>
                  <td className="px-4 py-3 text-[#5e6873]">{p.category?.name || '—'}</td>
                  <td className="px-4 py-3 text-[#5e6873]">{p.location || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-sm px-2 py-0.5 text-xs font-semibold ${
                      p.status === 'COMPLETED' ? 'bg-green-50 text-green-700' :
                      p.status === 'ONGOING' ? 'bg-blue-50 text-blue-700' :
                      'bg-gray-50 text-gray-600'
                    }`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold ${p.contentStatus === 'PUBLISHED' ? 'text-green-600' : 'text-[#9aa3ab]'}`}>
                      {p.contentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#5e6873]">{p._count.images}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Link href={`/admin/projects/${p.id}`} className="rounded p-1.5 text-[#5e6873] hover:bg-[#f1f3f5] hover:text-[#315d7a]" title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <Link href={`/projects/${p.slug}`} className="rounded p-1.5 text-[#5e6873] hover:bg-[#f1f3f5] hover:text-[#315d7a]" title="View public" target="_blank">
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button onClick={() => handleDelete(p.id, p.title)} className="rounded p-1.5 text-[#5e6873] hover:bg-red-50 hover:text-red-600" title="Delete">
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <p className="text-[#5e6873]">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="border border-[#d9dee4] bg-white px-3 py-1.5 text-[#5e6873] disabled:opacity-50">Previous</button>
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="border border-[#d9dee4] bg-white px-3 py-1.5 text-[#5e6873] disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </div>
  )
}
