'use client'

import { useEffect, useState } from 'react'
import { Save, Loader2 } from 'lucide-react'

interface CompanyData {
  displayName: string
  legalName: string
  tagline: string
  description: string
  establishedYear: number | null
  aboutText: string
  mission: string
  vision: string
  addressPrimary: string
  addressSecondary: string
  city: string
  province: string
  country: string
  website: string
  email: string
  whatsapp: string
  phonePrimary: string
  phoneSecondary: string
  facebook: string
  linkedin: string
  instagram: string
  googleMapsUrl: string
}

export default function AdminCompanyPage() {
  const [data, setData] = useState<CompanyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/company').then((r) => r.json()).then((r) => {
      if (r.success) setData(r.data)
      setLoading(false)
    })
  }, [])

  async function handleSave() {
    if (!data) return
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch('/api/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (result.success) {
        setMessage('Company information saved successfully.')
        setData(result.data)
      } else {
        setMessage(result.error?.message || 'Failed to save.')
      }
    } catch {
      setMessage('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function updateField(field: keyof CompanyData, value: string | number | null) {
    if (!data) return
    setData({ ...data, [field]: value })
  }

  if (loading) return <div className="flex h-64 items-center justify-center text-sm text-[#5e6873]">Loading...</div>
  if (!data) return <div className="text-sm text-red-600">Failed to load company data.</div>

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#17212b]">Company Information</h1>
          <p className="mt-1 text-sm text-[#5e6873]">Manage your company details. These values appear across the public website.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-[#315d7a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#264a63] disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </button>
      </div>

      {message && (
        <div className={`mb-4 border px-4 py-3 text-sm ${message.includes('success') ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {message}
        </div>
      )}

      <div className="space-y-6">
        {/* General */}
        <Section title="General Information">
          <Field label="Display Name" value={data.displayName} onChange={(v) => updateField('displayName', v)} />
          <Field label="Legal Name" value={data.legalName} onChange={(v) => updateField('legalName', v)} />
          <Field label="Tagline" value={data.tagline} onChange={(v) => updateField('tagline', v)} />
          <Field label="Established Year" value={data.establishedYear?.toString() || ''} onChange={(v) => updateField('establishedYear', v ? parseInt(v) : null)} type="number" />
          <TextArea label="About" value={data.aboutText} onChange={(v) => updateField('aboutText', v)} />
          <TextArea label="Description" value={data.description} onChange={(v) => updateField('description', v)} />
          <TextArea label="Mission" value={data.mission} onChange={(v) => updateField('mission', v)} />
          <TextArea label="Vision" value={data.vision} onChange={(v) => updateField('vision', v)} />
        </Section>

        {/* Contact */}
        <Section title="Contact Information">
          <Field label="Primary Phone" value={data.phonePrimary} onChange={(v) => updateField('phonePrimary', v)} placeholder="Not configured" />
          <Field label="Secondary Phone" value={data.phoneSecondary} onChange={(v) => updateField('phoneSecondary', v)} placeholder="Not configured" />
          <Field label="WhatsApp" value={data.whatsapp} onChange={(v) => updateField('whatsapp', v)} placeholder="Not configured" />
          <Field label="Email" value={data.email} onChange={(v) => updateField('email', v)} placeholder="Not configured" type="email" />
          <Field label="Website" value={data.website} onChange={(v) => updateField('website', v)} placeholder="Not configured" type="url" />
        </Section>

        {/* Address */}
        <Section title="Address">
          <Field label="Primary Address" value={data.addressPrimary} onChange={(v) => updateField('addressPrimary', v)} placeholder="Not configured" />
          <Field label="Secondary Address" value={data.addressSecondary} onChange={(v) => updateField('addressSecondary', v)} placeholder="Not configured" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="City" value={data.city} onChange={(v) => updateField('city', v)} />
            <Field label="Province" value={data.province} onChange={(v) => updateField('province', v)} />
            <Field label="Country" value={data.country} onChange={(v) => updateField('country', v)} />
          </div>
        </Section>

        {/* Social */}
        <Section title="Social & Online">
          <Field label="Facebook" value={data.facebook} onChange={(v) => updateField('facebook', v)} placeholder="Not configured" type="url" />
          <Field label="LinkedIn" value={data.linkedin} onChange={(v) => updateField('linkedin', v)} placeholder="Not configured" type="url" />
          <Field label="Instagram" value={data.instagram} onChange={(v) => updateField('instagram', v)} placeholder="Not configured" type="url" />
          <Field label="Google Maps URL" value={data.googleMapsUrl} onChange={(v) => updateField('googleMapsUrl', v)} placeholder="Not configured" type="url" />
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-[#e7ebef] bg-white p-6">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-[#315d7a]">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string | undefined | null; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#5e6873]">{label}</label>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || ''}
        className="mt-1 w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2.5 text-sm text-[#17212b] outline-none transition focus:border-[#315d7a]"
      />
    </div>
  )
}

function TextArea({ label, value, onChange }: {
  label: string; value: string | undefined | null; onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#5e6873]">{label}</label>
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="mt-1 w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2.5 text-sm text-[#17212b] outline-none transition focus:border-[#315d7a]"
      />
    </div>
  )
}
