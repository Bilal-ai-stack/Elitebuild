import type { Metadata } from 'next'
import Link from 'next/link'
import { getPublicCompany } from '@/lib/services/company'
import { PublicHeader } from '@/components/public-header'
import { PublicFooter } from '@/components/public-footer'
import { ContactForm } from '@/components/contact-form'
import { createWhatsAppLink, isWhatsAppConfigured } from '@/lib/services/whatsapp'
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  ExternalLink,
  MessageSquare,
  Clock,
  ShieldCheck,
} from 'lucide-react'

import { constructMetadata } from '@/lib/seo/config'
import { generateBreadcrumbSchema, generateOrganizationSchema } from '@/lib/seo/structured-data'
import { JsonLd } from '@/components/seo/json-ld'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = constructMetadata({
  title: 'Contact',
  description:
    'Connect with M/S ELITE CONSTRUCTION COMPANY for technical consultations, project inquiries, bidding, and procurement information.',
  pathname: '/contact',
})

export default async function ContactPage() {
  const company = await getPublicCompany()
  const hasWhatsApp = isWhatsAppConfigured(company.whatsapp)
  const whatsappUrl = hasWhatsApp
    ? createWhatsAppLink(company.whatsapp!, 'Hello, I would like to inquire about ELITEBUILD engineering and construction services.')
    : ''

  const hasPhone = company.phonePrimary || company.phoneSecondary
  const hasAddress = company.addressPrimary || company.addressSecondary || company.city
  const hasSocial = company.website || company.linkedin || company.facebook || company.instagram

  const breadcrumbs = generateBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Contact', path: '/contact' },
  ])
  const orgSchema = generateOrganizationSchema(company)

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f8fa] text-[#17212b]">
      <JsonLd data={[breadcrumbs, orgSchema]} />
      <PublicHeader company={company} />

      <main className="flex-1">
        {/* Page Header */}
        <section className="border-b border-[#dfe5e8] bg-white py-14 sm:py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#5e6873]">
              <Link href="/" className="hover:text-[#315d7a]">Home</Link>
              <span>/</span>
              <span className="text-[#315d7a]">Contact</span>
            </div>

            <div className="mt-6 max-w-3xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c58a2a]">
                Direct Technical Communications
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                Start a consultation for your next project.
              </h1>
              <p className="mt-6 text-base leading-8 text-[#5e6873]">
                Discuss civil works, road infrastructure, institutional buildings, rehabilitation, or project management requirements with our qualified engineering team.
              </p>
            </div>
          </div>
        </section>

        {/* Content Section: Info & Form */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
              {/* Left Column: Configurable Channels */}
              <div className="lg:col-span-5 space-y-8">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-[#17212b]">
                    Engineering Offices & Inquiries
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#5e6873]">
                    Official corporate points of contact for project inquiries, tenders, and administrative correspondence.
                  </p>
                </div>

                {/* Office Locations */}
                {hasAddress && (
                  <div className="rounded border border-[#dfe5e8] bg-white p-6 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-[#edf3f5] text-[#315d7a]">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div className="space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#315d7a]">
                          Documented Offices
                        </h3>

                        {company.addressPrimary && (
                          <div>
                            <p className="text-xs font-semibold text-[#17212b]">Primary Office</p>
                            <p className="mt-1 text-sm text-[#5e6873] leading-relaxed">
                              {company.addressPrimary}
                              {company.city ? `, ${company.city}` : ''}
                              {company.province ? `, ${company.province}` : ''}
                              {company.country ? `, ${company.country}` : ''}
                            </p>
                          </div>
                        )}

                        {company.addressSecondary && (
                          <div className="border-t border-[#edf1f3] pt-3">
                            <p className="text-xs font-semibold text-[#17212b]">Regional Office</p>
                            <p className="mt-1 text-sm text-[#5e6873] leading-relaxed">
                              {company.addressSecondary}
                            </p>
                          </div>
                        )}

                        {company.googleMapsUrl && (
                          <a
                            href={company.googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#315d7a] hover:underline"
                          >
                            View on Google Maps <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Telecommunications */}
                {hasPhone && (
                  <div className="rounded border border-[#dfe5e8] bg-white p-6 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-[#edf3f5] text-[#315d7a]">
                        <Phone className="h-4 w-4" />
                      </div>
                      <div className="space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#315d7a]">
                          Telephone Channels
                        </h3>
                        {company.phonePrimary && (
                          <div>
                            <p className="text-xs text-[#5e6873]">Primary Telephone</p>
                            <a
                              href={`tel:${company.phonePrimary}`}
                              className="text-sm font-semibold text-[#17212b] hover:text-[#315d7a]"
                            >
                              {company.phonePrimary}
                            </a>
                          </div>
                        )}
                        {company.phoneSecondary && (
                          <div>
                            <p className="text-xs text-[#5e6873]">Secondary Telephone</p>
                            <a
                              href={`tel:${company.phoneSecondary}`}
                              className="text-sm font-semibold text-[#17212b] hover:text-[#315d7a]"
                            >
                              {company.phoneSecondary}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Direct Electronic Mail */}
                {company.email && (
                  <div className="rounded border border-[#dfe5e8] bg-white p-6 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-[#edf3f5] text-[#315d7a]">
                        <Mail className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#315d7a]">
                          Electronic Mail
                        </h3>
                        <p className="mt-1 text-xs text-[#5e6873]">Tenders, Proposals & Corporate Communications</p>
                        <a
                          href={`mailto:${company.email}`}
                          className="mt-2 inline-block text-sm font-semibold text-[#17212b] hover:text-[#315d7a]"
                        >
                          {company.email}
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* WhatsApp Instant Messaging Channel */}
                {hasWhatsApp && (
                  <div className="rounded border border-[#3d7a5a]/30 bg-[#3d7a5a]/5 p-6 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-[#3d7a5a] text-white">
                        <MessageSquare className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#3d7a5a]">
                          WhatsApp Instant Messaging
                        </h3>
                        <p className="mt-1 text-xs text-[#5e6873]">
                          Direct connection for fast project inquiries and technical updates.
                        </p>
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex items-center gap-2 rounded bg-[#3d7a5a] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#32664b]"
                        >
                          Chat on WhatsApp <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* Digital & Social Footprint */}
                {hasSocial && (
                  <div className="rounded border border-[#dfe5e8] bg-white p-6 shadow-sm">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#315d7a]">
                      Digital Presence
                    </h3>
                    <div className="mt-4 flex flex-wrap gap-4 text-xs font-medium text-[#5e6873]">
                      {company.website && (
                        <a
                          href={company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 hover:text-[#315d7a]"
                        >
                          <Globe className="h-3.5 w-3.5" /> Official Website
                        </a>
                      )}
                      {company.linkedin && (
                        <a
                          href={company.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-[#315d7a]"
                        >
                          LinkedIn
                        </a>
                      )}
                      {company.facebook && (
                        <a
                          href={company.facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-[#315d7a]"
                        >
                          Facebook
                        </a>
                      )}
                      {company.instagram && (
                        <a
                          href={company.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-[#315d7a]"
                        >
                          Instagram
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Assurance Note */}
                <div className="flex items-center gap-3 border-t border-[#dfe5e8] pt-6 text-xs text-[#5e6873]">
                  <ShieldCheck className="h-4 w-4 text-[#3d7a5a] shrink-0" />
                  <span>
                    Verified business communications. Registered under PEC and governmental contracting bodies.
                  </span>
                </div>
              </div>

              {/* Right Column: Inquiry Submission Form */}
              <div className="lg:col-span-7">
                <div className="rounded border border-[#dfe5e8] bg-white p-8 shadow-sm sm:p-10">
                  <div className="border-b border-[#edf1f3] pb-6">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c58a2a]">
                      Online Inquiries
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#17212b]">
                      Submit a Project or Technical Inquiry
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[#5e6873]">
                      Provide your project parameters below. Submissions are transmitted directly to our technical evaluation team.
                    </p>
                  </div>

                  <div className="mt-6">
                    <ContactForm />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter company={company} />
    </div>
  )
}
