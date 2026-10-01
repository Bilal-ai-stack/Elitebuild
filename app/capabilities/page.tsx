import type { Metadata } from 'next'
import Link from 'next/link'
import { getPublicCapabilities } from '@/lib/services/content'
import { getPublicCompany } from '@/lib/services/company'
import { PublicHeader } from '@/components/public-header'
import { PublicFooter } from '@/components/public-footer'
import { Zap, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react'

import { constructMetadata } from '@/lib/seo/config'
import { generateBreadcrumbSchema } from '@/lib/seo/structured-data'
import { JsonLd } from '@/components/seo/json-ld'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = constructMetadata({
  title: 'Capabilities',
  description:
    'Verified civil engineering, road network, structural construction, and infrastructure execution capabilities of M/S ELITE CONSTRUCTION COMPANY.',
  pathname: '/capabilities',
})

export default async function CapabilitiesPage() {
  const [capabilities, company] = await Promise.all([
    getPublicCapabilities(),
    getPublicCompany(),
  ])

  const breadcrumbs = generateBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Capabilities', path: '/capabilities' },
  ])

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f8fa] text-[#17212b]">
      <JsonLd data={breadcrumbs} />
      <PublicHeader company={company} />

      <main className="flex-1">
        {/* Header Banner */}
        <section className="border-b border-[#dfe5e8] bg-white py-14 sm:py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#5e6873]">
              <Link href="/" className="hover:text-[#315d7a]">Home</Link>
              <span>/</span>
              <span className="text-[#315d7a]">Capabilities</span>
            </div>

            <div className="mt-6 max-w-3xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#315d7a]">
                Execution Disciplines
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                Engineering & construction capabilities.
              </h1>
              <p className="mt-6 text-base leading-8 text-[#5e6873]">
                Our operational capacity is grounded in verified past performance, heavy equipment fleet readiness, and seasoned site engineers capable of navigating challenging topography and demanding project timelines.
              </p>
            </div>
          </div>
        </section>

        {/* Capabilities Grid */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            {capabilities.length === 0 ? (
              <div className="border border-[#e7ebef] bg-white p-16 text-center">
                <Zap className="mx-auto h-12 w-12 text-[#9aa3ab]" />
                <h3 className="mt-4 text-xl font-semibold text-[#17212b]">Capabilities Registry</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-[#5e6873]">
                  Technical scope records are currently being synchronized. Please inspect our services or contact our office directly.
                </p>
                <Link
                  href="/services"
                  className="mt-6 inline-flex items-center gap-2 bg-[#315d7a] px-5 py-2.5 text-xs font-semibold text-white"
                >
                  View Services &rarr;
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {capabilities.map((cap, index) => (
                  <article
                    key={cap.id}
                    className="flex flex-col justify-between border border-[#d8e0e4] bg-white p-7 transition hover:-translate-y-1 hover:border-[#c58a2a] hover:shadow-lg"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#c58a2a]">
                          0{index + 1}
                        </span>
                        {cap.featured && (
                          <span className="bg-[#315d7a]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#315d7a]">
                            Core Specialization
                          </span>
                        )}
                      </div>

                      <h3 className="mt-6 text-xl font-semibold text-[#17212b]">
                        {cap.title}
                      </h3>

                      {cap.description ? (
                        <p className="mt-3 text-sm leading-6 text-[#5e6873]">
                          {cap.description}
                        </p>
                      ) : (
                        <p className="mt-3 text-sm leading-6 text-[#8b969f]">
                          Standard technical execution and supervisory capability maintained across all company civil engineering projects.
                        </p>
                      )}
                    </div>

                    <div className="mt-8 border-t border-[#f1f3f5] pt-4">
                      <div className="h-0.5 w-8 bg-[#315d7a]" />
                    </div>
                  </article>
                ))}
              </div>
            )}

            {/* Bottom Inquire Card */}
            <div className="mt-16 flex flex-col items-center justify-between gap-6 border-t border-[#dfe5e8] bg-white p-8 sm:flex-row sm:p-10">
              <div>
                <h3 className="text-lg font-semibold text-[#17212b]">Inquire about specialized technical capabilities?</h3>
                <p className="mt-1 text-sm text-[#5e6873]">Our engineering team provides pre-tender consultations and feasibility assessments.</p>
              </div>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 bg-[#c58a2a] px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#af7921]"
              >
                Inquire With Engineering Team <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter company={company} />
    </div>
  )
}
