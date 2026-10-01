'use client'

import { useState } from 'react'
import { Loader2, CheckCircle2, AlertCircle, Send } from 'lucide-react'

interface ContactFormProps {
  defaultSubject?: string
  className?: string
}

export function ContactForm({ defaultSubject = '', className = '' }: ContactFormProps) {
  const [form, setForm] = useState({
    name: '',
    organization: '',
    email: '',
    phone: '',
    whatsapp: '',
    subject: defaultSubject,
    projectType: '',
    preferredContactMethod: 'email',
    message: '',
  })

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError('Please fill in your name, email, and message.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setSuccess(true)
        setForm({
          name: '',
          organization: '',
          email: '',
          phone: '',
          whatsapp: '',
          subject: defaultSubject,
          projectType: '',
          preferredContactMethod: 'email',
          message: '',
        })
      } else {
        setError(data.error?.message || 'Failed to submit inquiry. Please try again.')
      }
    } catch {
      setError('Unable to send inquiry right now. Please check your network and try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className={`border border-[#3d7a5a]/20 bg-white p-8 text-center shadow-sm ${className}`}>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#3d7a5a]/10 text-[#3d7a5a]">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-xl font-semibold text-[#17212b]">Inquiry Submitted Successfully</h3>
        <p className="mt-2 text-sm text-[#5e6873]">
          Thank you for reaching out to M/S ELITE CONSTRUCTION COMPANY. Our engineering and project management team will review your requirements and respond shortly.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="mt-6 inline-flex items-center gap-2 border border-[#d9dee4] bg-[#f7f8fa] px-5 py-2.5 text-xs font-semibold text-[#315d7a] transition hover:bg-[#315d7a] hover:text-white"
        >
          Send Another Inquiry
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={`border border-[#d9dee4] bg-white p-6 sm:p-8 shadow-sm ${className}`}>
      {error && (
        <div className="mb-6 flex items-start gap-3 border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#5e6873]">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            id="contact-name"
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Engr. Ahmad Khan"
            className="w-full border border-[#d9dee4] bg-[#f7f8fa] px-3.5 py-2.5 text-sm text-[#17212b] outline-none transition focus:border-[#315d7a] focus:bg-white"
          />
        </div>

        <div>
          <label htmlFor="contact-org" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#5e6873]">
            Client / Organization
          </label>
          <input
            id="contact-org"
            type="text"
            value={form.organization}
            onChange={(e) => setForm({ ...form, organization: e.target.value })}
            placeholder="e.g. C&W Department, Private Entity"
            className="w-full border border-[#d9dee4] bg-[#f7f8fa] px-3.5 py-2.5 text-sm text-[#17212b] outline-none transition focus:border-[#315d7a] focus:bg-white"
          />
        </div>

        <div>
          <label htmlFor="contact-email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#5e6873]">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            id="contact-email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="name@domain.com"
            className="w-full border border-[#d9dee4] bg-[#f7f8fa] px-3.5 py-2.5 text-sm text-[#17212b] outline-none transition focus:border-[#315d7a] focus:bg-white"
          />
        </div>

        <div>
          <label htmlFor="contact-phone" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#5e6873]">
            Phone Number
          </label>
          <input
            id="contact-phone"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+92 300 0000000"
            className="w-full border border-[#d9dee4] bg-[#f7f8fa] px-3.5 py-2.5 text-sm text-[#17212b] outline-none transition focus:border-[#315d7a] focus:bg-white"
          />
        </div>

        <div>
          <label htmlFor="contact-project-type" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#5e6873]">
            Project Nature / Scope
          </label>
          <select
            id="contact-project-type"
            value={form.projectType}
            onChange={(e) => setForm({ ...form, projectType: e.target.value })}
            className="w-full border border-[#d9dee4] bg-[#f7f8fa] px-3.5 py-2.5 text-sm text-[#17212b] outline-none transition focus:border-[#315d7a] focus:bg-white"
          >
            <option value="">Select Category (Optional)</option>
            <option value="Roads & Highways">Roads & Highways</option>
            <option value="Bridges & Structural">Bridges & Structural</option>
            <option value="Buildings & Facilities">Buildings & Facilities</option>
            <option value="Drainage & Water Infrastructure">Drainage & Water Infrastructure</option>
            <option value="Rehabilitation & Maintenance">Rehabilitation & Maintenance</option>
            <option value="Site Development & Utilities">Site Development & Utilities</option>
            <option value="Project Management Consultation">Project Management Consultation</option>
            <option value="Other Civil Works">Other Civil Works</option>
          </select>
        </div>

        <div>
          <label htmlFor="contact-pref-method" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#5e6873]">
            Preferred Contact Method
          </label>
          <select
            id="contact-pref-method"
            value={form.preferredContactMethod}
            onChange={(e) => setForm({ ...form, preferredContactMethod: e.target.value })}
            className="w-full border border-[#d9dee4] bg-[#f7f8fa] px-3.5 py-2.5 text-sm text-[#17212b] outline-none transition focus:border-[#315d7a] focus:bg-white"
          >
            <option value="email">Email</option>
            <option value="phone">Phone Call</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor="contact-subject" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#5e6873]">
          Subject
        </label>
        <input
          id="contact-subject"
          type="text"
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          placeholder="e.g. Inquiry regarding highway rehabilitation tender or construction works"
          className="w-full border border-[#d9dee4] bg-[#f7f8fa] px-3.5 py-2.5 text-sm text-[#17212b] outline-none transition focus:border-[#315d7a] focus:bg-white"
        />
      </div>

      <div className="mt-5">
        <label htmlFor="contact-message" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#5e6873]">
          Project Details / Message <span className="text-red-500">*</span>
        </label>
        <textarea
          id="contact-message"
          required
          rows={5}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          placeholder="Please describe project scope, location, timeline, and any specific engineering requirements..."
          className="w-full border border-[#d9dee4] bg-[#f7f8fa] px-3.5 py-2.5 text-sm text-[#17212b] outline-none transition focus:border-[#315d7a] focus:bg-white"
        />
      </div>

      <div className="mt-7 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <p className="text-xs text-[#5e6873]">
          Submissions are registered directly in our project management tracking system.
        </p>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2.5 bg-[#c58a2a] px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-[0_4px_14px_rgba(197,138,42,0.25)] transition hover:bg-[#af7921] disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" /> Submit Inquiry
            </>
          )}
        </button>
      </div>
    </form>
  )
}
