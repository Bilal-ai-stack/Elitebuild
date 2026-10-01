import type { Metadata } from 'next'
import Link from 'next/link'
import { getPublicCompany } from '@/lib/services/company'
import { getPublicCapabilities } from '@/lib/services/content'
import { getPublicTeamMembers } from '@/lib/services/team'
import { PublicHeader } from '@/components/public-header'
import { PublicFooter } from '@/components/public-footer'
import { Building2, ShieldCheck, MapPin, Target, Eye, ArrowRight, CheckCircle2, Users } from 'lucide-react'

import { constructMetadata } from '@/lib/seo/config'
import { generateBreadcrumbSchema, generateOrganizationSchema } from '@/lib/seo/structured-data'
import { JsonLd } from '@/components/seo/json-ld'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = constructMetadata({
  title: 'About',
  description:
    'Learn about M/S ELITE CONSTRUCTION COMPANY, established in 2006. Engineering capabilities, leadership, and project execution experience across Pakistan.',
  pathname: '/about',
})

export default async function AboutPage() {
  const [company, capabilities, team] = await Promise.all([
    getPublicCompany(),
    getPublicCapabilities(),
    getPublicTeamMembers(),
  ])
  const estYear = company.establishedYear || 2006

  const breadcrumbs = generateBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
  ])
  const orgSchema = generateOrganizationSchema(company)

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f8fa] text-[#17212b]">
      <JsonLd data={[breadcrumbs, orgSchema]} />
      <PublicHeader company={company} />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="border-b border-[#dfe5e8] bg-white py-14 sm:py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#5e6873]">
              <Link href="/" className="hover:text-[#315d7a]">Home</Link>
              <span>/</span>
              <span className="text-[#315d7a]">About</span>
            </div>

            <div className="mt-6 max-w-3xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c58a2a]">
                Company Overview
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                Engineering excellence grounded in verified project delivery.
              </h1>
              <p className="mt-6 text-base leading-8 text-[#5e6873]">
                {company.description ||
                  `M/S ELITE CONSTRUCTION COMPANY is an established engineering and contracting firm established in ${estYear}. The organization provides comprehensive services spanning civil works, road networks, bridge structures, institutional buildings, water infrastructure, rehabilitation, and full-cycle project management.`}
              </p>
            </div>
          </div>
        </section>

        {/* Core Profile Details */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
              {/* Left Column: Organization Heritage */}
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-[#17212b]">
                  Organization Heritage & Operating Principles
                </h2>
                <div className="mt-6 space-y-4 text-sm leading-7 text-[#5e6873]">
                  <p>
                    {company.aboutText ||
                      `Since our foundation in ${estYear}, ELITE CONSTRUCTION COMPANY has operated as a trusted technical partner to public-sector departments, autonomous authorities, institutional bodies, and private infrastructure developers across Pakistan.`}
                  </p>
                  <p>
                    Our multidisciplinary teams of qualified engineers, site supervisors, and project managers prioritize structural integrity, rigorous materials compliance, transparent schedule management, and job-site safety on every engagement.
                  </p>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-4 border-t border-[#e2e7ea] pt-6">
                  <div className="border border-[#e7ebef] bg-white p-5">
                    <p className="text-3xl font-semibold text-[#315d7a]">{estYear}</p>
                    <p className="mt-1 text-xs font-medium text-[#5e6873]">Established Year</p>
                  </div>
                  <div className="border border-[#e7ebef] bg-white p-5">
                    <p className="text-3xl font-semibold text-[#c58a2a]">
                      {company.city || 'Peshawar'}
                    </p>
                    <p className="mt-1 text-xs font-medium text-[#5e6873]">Registered Headquarters</p>
                  </div>
                </div>
              </div>

              {/* Right Column: Mission & Vision */}
              <div className="space-y-6">
                {(company.mission || !company.aboutText) && (
                  <div className="border border-[#d9dee4] bg-white p-8">
                    <div className="flex items-center gap-3 text-[#315d7a]">
                      <Target className="h-6 w-6" />
                      <h3 className="text-lg font-semibold text-[#17212b]">Our Mission</h3>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-[#5e6873]">
                      {company.mission ||
                        'To deliver resilient, high-quality civil engineering infrastructure and building projects with strict adherence to design specifications, budget parameters, and client timelines.'}
                    </p>
                  </div>
                )}

                {(company.vision || !company.aboutText) && (
                  <div className="border border-[#d9dee4] bg-white p-8">
                    <div className="flex items-center gap-3 text-[#c58a2a]">
                      <Eye className="h-6 w-6" />
                      <h3 className="text-lg font-semibold text-[#17212b]">Our Vision</h3>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-[#5e6873]">
                      {company.vision ||
                        'To stand as a benchmark for dependable engineering construction, recognized across the region for technical competence, execution discipline, and long-lasting structural quality.'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Offices & Regional Presence */}
            <div className="mt-16 border border-[#d9dee4] bg-white p-8 sm:p-10">
              <h3 className="text-xl font-semibold text-[#17212b]">Documented Offices & Operations</h3>
              <p className="mt-2 text-sm text-[#5e6873]">
                Administrative and technical coordination centers supporting field projects.
              </p>

              <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="border border-[#e7ebef] bg-[#fbfcfc] p-6">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#315d7a]">
                    <MapPin className="h-4 w-4 text-[#c58a2a]" /> Regional Office
                  </div>
                  <p className="mt-3 text-sm font-semibold text-[#17212b]">
                    {company.addressPrimary || 'Hamza Tower, F-11 Markaz'}
                  </p>
                  <p className="mt-1 text-xs text-[#5e6873]">
                    {company.city && company.province ? `${company.city}, ${company.province}` : 'Islamabad / Regional Projects'}
                  </p>
                </div>

                <div className="border border-[#e7ebef] bg-[#fbfcfc] p-6">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#315d7a]">
                    <MapPin className="h-4 w-4 text-[#c58a2a]" /> Head Office / Operational Base
                  </div>
                  <p className="mt-3 text-sm font-semibold text-[#17212b]">
                    {company.addressSecondary || 'Jawad Tower, University Road'}
                  </p>
                  <p className="mt-1 text-xs text-[#5e6873]">
                    Peshawar, Khyber Pakhtunkhwa, Pakistan
                  </p>
                </div>
              </div>
            </div>

            {/* Capabilities Summary */}
            {capabilities.length > 0 && (
              <div className="mt-16">
                <h3 className="text-xl font-semibold text-[#17212b]">Key Disciplines & Core Capabilities</h3>
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {capabilities.map((cap) => (
                    <div key={cap.id} className="border border-[#e7ebef] bg-white p-6">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#c58a2a]">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>{cap.title}</span>
                      </div>
                      {cap.description && (
                        <p className="mt-3 text-xs leading-6 text-[#5e6873]">{cap.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Technical Leadership & Key Personnel */}
            {team.length > 0 && (
              <div className="mt-16">
                <h3 className="text-xl font-semibold text-[#17212b]">Key Engineering Personnel & Leadership</h3>
                <p className="mt-2 text-sm text-[#5e6873]">
                  Qualified engineers, site supervisors, and technical managers responsible for quality and delivery.
                </p>
                <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {team.map((member) => (
                    <div key={member.id} className="border border-[#e7ebef] bg-white p-6 shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded bg-[#edf3f5] text-sm font-bold text-[#315d7a]">
                          {member.photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={member.photoUrl} alt={member.name} className="h-full w-full object-cover" />
                          ) : (
                            member.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold text-[#17212b]">{member.name}</h4>
                          {member.title && <p className="text-xs font-medium text-[#c58a2a]">{member.title}</p>}
                          {member.department && <p className="text-[11px] text-[#5e6873]">{member.department}</p>}
                        </div>
                      </div>
                      {member.bio && (
                        <p className="mt-4 text-xs leading-6 text-[#5e6873] border-t border-[#f1f3f5] pt-3">
                          {member.bio}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            <div className="mt-16 flex flex-col items-center justify-between gap-6 border-t border-[#e2e7ea] pt-12 sm:flex-row">
              <div>
                <h4 className="text-lg font-semibold text-[#17212b]">Looking to collaborate on a civil construction project?</h4>
                <p className="mt-1 text-sm text-[#5e6873]">Inquire about our qualifications, past contracts, or tender participation.</p>
              </div>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2.5 bg-[#c58a2a] px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#af7921]"
              >
                Request a Consultation <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter company={company} />
    </div>
  )
}
