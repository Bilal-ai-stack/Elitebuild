'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Save, Loader2, ArrowLeft, Upload, Trash2, ImageIcon } from 'lucide-react'
import Link from 'next/link'

const STATUS_OPTIONS = ['PLANNED', 'ONGOING', 'COMPLETED', 'MAINTENANCE', 'ARCHIVED']
const CONTENT_STATUS_OPTIONS = ['DRAFT', 'PUBLISHED', 'ARCHIVED']

interface ProjectImage {
  id: string
  imageUrl: string
  altText: string | null
  caption: string | null
  featured: boolean
  displayOrder: number
}

interface Category {
  id: string
  name: string
}

export default function AdminProjectEditPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const isNew = id === 'new'
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    title: '', slug: '', shortDescription: '', description: '',
    location: '', clientOrganization: '', status: 'PLANNED',
    contentStatus: 'DRAFT', scope: '', contractType: '',
    featured: false, displayOrder: 0, categoryId: '',
  })
  const [categories, setCategories] = useState<Category[]>([])
  const [clientOrgs, setClientOrgs] = useState<{ id: string; name: string; shortName: string | null }[]>([])
  const [images, setImages] = useState<ProjectImage[]>([])
  const [linkedCertificates, setLinkedCertificates] = useState<{ id: string; title: string; verified: boolean; issueDate: string | null }[]>([])
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/projects/categories')
      .then((r) => r.json())
      .then((r) => {
        if (r.success) setCategories(r.data)
      })

    fetch('/api/client-organizations')
      .then((r) => r.json())
      .then((r) => {
        if (r.success) setClientOrgs(r.data)
      })

    if (!isNew) {
      fetch(`/api/projects/${id}`).then((r) => r.json()).then((r) => {
        if (r.success) {
          const p = r.data
          setForm({
            title: p.title || '', slug: p.slug || '',
            shortDescription: p.shortDescription || '', description: p.description || '',
            location: p.location || '', clientOrganization: p.clientOrganization || '',
            status: p.status || 'PLANNED', contentStatus: p.contentStatus || 'DRAFT',
            scope: p.scope || '', contractType: p.contractType || '',
            featured: p.featured || false, displayOrder: p.displayOrder || 0,
            categoryId: p.categoryId || '',
          })
          setImages(p.images || [])
        }
        setLoading(false)
      })

      fetch('/api/performance-certificates').then((r) => r.json()).then((r) => {
        if (r.success && Array.isArray(r.data)) {
          setLinkedCertificates(r.data.filter((c: any) => c.projectId === id))
        }
      })
    }
  }, [id, isNew])

  function generateSlug(title: string) {
    return title.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-')
  }

  async function handleSave() {
    setSaving(true)
    setMessage('')
    const url = isNew ? '/api/projects' : `/api/projects/${id}`
    const method = isNew ? 'POST' : 'PUT'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          categoryId: form.categoryId || null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        if (isNew) {
          router.push(`/admin/projects/${data.data.id}`)
        } else {
          setMessage('Project saved successfully.')
        }
      } else {
        setMessage(data.error?.message || 'Failed to save.')
      }
    } catch {
      setMessage('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || isNew) return
    setUploading(true)
    setMessage('')
    const formData = new FormData()
    formData.append('file', file)
    formData.append('altText', form.title || 'Project photograph')
    try {
      const res = await fetch(`/api/projects/${id}/images`, { method: 'POST', body: formData })
      const data = await res.json()
      if (data.success) {
        setImages((prev) => [...prev, data.data])
      } else {
        setMessage(data.error?.message || 'Upload failed.')
      }
    } catch {
      setMessage('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDeleteImage(imageId: string) {
    if (!confirm('Delete this photograph?')) return
    const res = await fetch(`/api/projects/${id}/images?imageId=${imageId}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) {
      setImages((prev) => prev.filter((img) => img.id !== imageId))
    }
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-[#5e6873]" /></div>

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/projects" className="rounded p-1.5 text-[#5e6873] hover:bg-[#f1f3f5]">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-[#17212b]">{isNew ? 'Create Project' : 'Edit Project'}</h1>
            {!isNew && <p className="mt-0.5 text-xs text-[#5e6873]">ID: {id}</p>}
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-[#315d7a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#264a63] disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isNew ? 'Create' : 'Save'}
        </button>
      </div>

      {message && (
        <div className={`mb-4 border px-4 py-3 text-sm ${message.includes('success') ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {message}
        </div>
      )}

      <div className="space-y-6">
        <div className="border border-[#e7ebef] bg-white p-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-[#315d7a]">Basic Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#5e6873]">Title *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, ...(isNew ? { slug: generateSlug(e.target.value) } : {}) })} className="mt-1 w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2.5 text-sm outline-none focus:border-[#315d7a]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5e6873]">Slug *</label>
              <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="mt-1 w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2.5 text-sm outline-none focus:border-[#315d7a]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5e6873]">Short Description</label>
              <input value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} className="mt-1 w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2.5 text-sm outline-none focus:border-[#315d7a]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5e6873]">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={5} className="mt-1 w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2.5 text-sm outline-none focus:border-[#315d7a]" />
            </div>
          </div>
        </div>

        <div className="border border-[#e7ebef] bg-white p-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-[#315d7a]">Project Details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-[#5e6873]">Location</label>
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="mt-1 w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2.5 text-sm outline-none focus:border-[#315d7a]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5e6873]">Client Organization</label>
              <input
                list="client-org-datalist"
                value={form.clientOrganization}
                onChange={(e) => setForm({ ...form, clientOrganization: e.target.value })}
                placeholder="Select or enter client organization"
                className="mt-1 w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2.5 text-sm outline-none focus:border-[#315d7a]"
              />
              <datalist id="client-org-datalist">
                {clientOrgs.map((org) => (
                  <option key={org.id} value={org.name}>
                    {org.shortName ? `${org.name} (${org.shortName})` : org.name}
                  </option>
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5e6873]">Category</label>
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="mt-1 w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2.5 text-sm outline-none focus:border-[#315d7a]">
                <option value="">Not configured</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5e6873]">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-1 w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2.5 text-sm outline-none focus:border-[#315d7a]">
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5e6873]">Publish Status</label>
              <select value={form.contentStatus} onChange={(e) => setForm({ ...form, contentStatus: e.target.value })} className="mt-1 w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2.5 text-sm outline-none focus:border-[#315d7a]">
                {CONTENT_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5e6873]">Contract Type</label>
              <input value={form.contractType} onChange={(e) => setForm({ ...form, contractType: e.target.value })} className="mt-1 w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2.5 text-sm outline-none focus:border-[#315d7a]" />
            </div>
            <div className="flex items-center gap-3 pt-5">
              <input type="checkbox" id="featured" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="h-4 w-4" />
              <label htmlFor="featured" className="text-sm text-[#17212b]">Featured project</label>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-xs font-semibold text-[#5e6873]">Scope</label>
            <textarea value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} rows={4} className="mt-1 w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2.5 text-sm outline-none focus:border-[#315d7a]" />
          </div>
        </div>

        {/* Gallery */}
        {!isNew && (
          <div className="border border-[#e7ebef] bg-white p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#315d7a]">Project Gallery</h2>
                <p className="mt-1 text-xs text-[#5e6873]">Upload real project-site photographs. Placeholders are not required.</p>
              </div>
              <div>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleUpload} className="hidden" id="gallery-upload" />
                <label htmlFor="gallery-upload" className={`inline-flex cursor-pointer items-center gap-2 bg-[#315d7a] px-4 py-2 text-sm font-semibold text-white ${uploading ? 'opacity-50' : ''}`}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Upload Photograph
                </label>
              </div>
            </div>

            {images.length === 0 ? (
              <div className="flex flex-col items-center justify-center border border-dashed border-[#d9dee4] bg-[#f7f8fa] px-4 py-12 text-center">
                <ImageIcon className="h-8 w-8 text-[#9aa3ab]" />
                <p className="mt-3 text-sm text-[#5e6873]">No photographs yet</p>
                <p className="mt-1 text-xs text-[#9aa3ab]">Add verified project-site images when available</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {images.map((img) => (
                  <div key={img.id} className="border border-[#e7ebef] bg-[#f7f8fa]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.imageUrl} alt={img.altText || 'Project photograph'} className="aspect-[4/3] w-full object-cover" />
                    <div className="flex items-center justify-between gap-2 p-3">
                      <p className="truncate text-xs text-[#5e6873]">{img.caption || img.altText || 'Untitled'}</p>
                      <button onClick={() => handleDeleteImage(img.id)} className="rounded p-1 text-[#5e6873] hover:bg-red-50 hover:text-red-600" aria-label="Delete image">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Linked Performance Certificates */}
        {!isNew && (
          <div className="border border-[#e7ebef] bg-white p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#315d7a]">
                  Linked Performance Certificates
                </h2>
                <p className="mt-1 text-xs text-[#5e6873]">
                  Client-issued certificates associated with this contract.
                </p>
              </div>
              <Link
                href="/admin/performance-certificates"
                className="inline-flex items-center gap-1.5 border border-[#315d7a] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#315d7a] transition hover:bg-[#315d7a]/5"
              >
                Manage Certificates &rarr;
              </Link>
            </div>

            {linkedCertificates.length === 0 ? (
              <div className="border border-dashed border-[#d9dee4] bg-[#f7f8fa] px-4 py-6 text-center text-xs text-[#5e6873]">
                No performance certificates linked to this project yet.
              </div>
            ) : (
              <div className="space-y-2">
                {linkedCertificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="flex items-center justify-between border border-[#e7ebef] bg-[#f7f8fa] px-4 py-2.5 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-[#17212b]">{cert.title}</p>
                      {cert.issueDate && (
                        <p className="mt-0.5 text-[#5e6873]">
                          Issued: {new Date(cert.issueDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                        </p>
                      )}
                    </div>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        cert.verified
                          ? 'bg-[#3d7a5a]/10 text-[#3d7a5a]'
                          : 'bg-[#c58a2a]/10 text-[#c58a2a]'
                      }`}
                    >
                      {cert.verified ? 'Verified' : 'Pending Verification'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {isNew && (
          <div className="border border-[#e7ebef] bg-[#f7f8fa] px-4 py-6 text-center text-sm text-[#5e6873]">
            Save the project first, then upload gallery photographs.
          </div>
        )}
      </div>
    </div>
  )
}
