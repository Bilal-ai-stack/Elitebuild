'use client'

import { useEffect, useState } from 'react'
import { Save, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string | null>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [forbidden, setForbidden] = useState(false)

  useEffect(() => {
    fetch('/api/settings').then(async (r) => {
      const data = await r.json()
      if (r.status === 403) {
        setForbidden(true)
      } else if (data.success) {
        setSettings(data.data)
      }
      setLoading(false)
    })
  }, [])

  async function handleSave() {
    setSaving(true)
    setMessage('')
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
    })
    const data = await res.json()
    if (data.success) {
      setSettings(data.data)
      setMessage('Settings saved successfully.')
    } else {
      setMessage(data.error?.message || 'Failed to save.')
    }
    setSaving(false)
  }

  function update(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-[#5e6873]" /></div>

  if (forbidden) {
    return (
      <div className="border border-[#e7ebef] bg-white p-8 text-center">
        <h1 className="text-xl font-semibold text-[#17212b]">Settings</h1>
        <p className="mt-2 text-sm text-[#5e6873]">Only SUPER_ADMIN can manage site settings.</p>
        <p className="mt-4 text-sm text-[#5e6873]">
          Contact details are managed under{' '}
          <Link href="/admin/company" className="font-semibold text-[#315d7a]">Company</Link>.
        </p>
      </div>
    )
  }

  const fields = [
    { key: 'company_name', label: 'Company name (display)' },
    { key: 'tagline', label: 'Tagline' },
    { key: 'footer_description', label: 'Footer description' },
    { key: 'default_meta_title', label: 'Default SEO title' },
    { key: 'default_meta_description', label: 'Default SEO description' },
  ]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#17212b]">Site Settings</h1>
          <p className="mt-1 text-sm text-[#5e6873]">
            Phone, WhatsApp, email, and addresses are configured in{' '}
            <Link href="/admin/company" className="font-semibold text-[#315d7a]">Company</Link>.
          </p>
        </div>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-[#315d7a] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#264a63] disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
        </button>
      </div>

      {message && (
        <div className={`mb-4 border px-4 py-3 text-sm ${message.includes('success') ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {message}
        </div>
      )}

      <div className="space-y-4 border border-[#e7ebef] bg-white p-6">
        {fields.map((field) => (
          <div key={field.key}>
            <label className="block text-xs font-semibold text-[#5e6873]">{field.label}</label>
            {field.key.includes('description') ? (
              <textarea
                value={settings[field.key] ?? ''}
                onChange={(e) => update(field.key, e.target.value)}
                rows={3}
                placeholder="Not configured"
                className="mt-1 w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2.5 text-sm outline-none focus:border-[#315d7a]"
              />
            ) : (
              <input
                value={settings[field.key] ?? ''}
                onChange={(e) => update(field.key, e.target.value)}
                placeholder="Not configured"
                className="mt-1 w-full border border-[#d9dee4] bg-[#f7f8fa] px-3 py-2.5 text-sm outline-none focus:border-[#315d7a]"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
