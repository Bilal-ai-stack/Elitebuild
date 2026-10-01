import type { Metadata } from 'next'
import Link from 'next/link'
import { getPublicServices } from '@/lib/services/services'
import { getPublicCompany } from '@/lib/services/company'
import { PublicHeader } from '@/components/public-header'
import { PublicFooter } from '@/components/public-footer'
import { Building2, ArrowRight, ChevronRight, Wrench, Shield, Check } from 'lucide-react'

import { constructMetadata } from '@/lib/seo/config'
import { generateBreadcrumbSchema } from '@/lib/seo/structured-data'
import { JsonLd } from '@/components/seo/json-ld'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = constructMetadata({
  title: 'Construction & Engineering Services',
  description:
    'Comprehensive civil construction, infrastructure, road networks, bridge building, and project management services by M/S ELITE CONSTRUCTION COMPANY.',
  pathname: '/services',
})

export default async function ServicesPage() {
  const [services, company] = await Promise.all([
    getPublicServices(),
    getPublicCompany(),
  ])

  const breadcrumbs = generateBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Services', path: '/services' },
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
              <span className="text-[#315d7a]">Services</span>
            </div>

            <div className="mt-6 max-w-3xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c58a2a]">
                Engineering Solutions
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                Civil construction & infrastructure services.
              </h1>
              <p className="mt-6 text-base leading-8 text-[#5e6873]">
                From engineering design coordination and site preparation through structural construction, rehabilitation, and hand-over, our teams provide turnkey execution for institutional, government, and commercial projects.
              </p>
            </div>
          </div>
        </section>

        {/* Services Grid */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            {services.length === 0 ? (
              <div className="border border-[#e7ebef] bg-white p-12 text-center">
                <Wrench className="mx-auto h-10 w-10 text-[#9aa3ab]" />
                <h3 className="mt-4 text-lg font-semibold text-[#17212b]">Services Catalog Being Updated</h3>
                <p className="mt-2 text-sm text-[#5e6873]">
                  Our active services list is currently being synchronized with our latest project licenses. Please contact our technical team directly.
                </p>
                <Link
                  href="/contact"
                  className="mt-6 inline-flex items-center gap-2 bg-[#315d7a] px-5 py-2.5 text-xs font-semibold text-white"
                >
                  Contact Technical Team &rarr;
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {services.map((service, index) => (
                  <article
                    key={service.id}
                    className="flex flex-col justify-between border border-[#dfe5e8] bg-white p-7 transition hover:border-[#c58a2a] hover:shadow-[0_16px_34px_rgba(23,33,43,0.06)]"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="flex h-11 w-11 items-center justify-center bg-[#edf3f5] text-[#315d7a]">
                          <Building2 className="h-5 w-5" />
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9aa3ab]">
                          0{index + 1}
                        </span>
                      </div>

                      {service.category && (
                        <span className="mt-6 inline-block text-[10px] font-bold uppercase tracking-[0.15em] text-[#c58a2a]">
                          {service.category.name}
                        </span>
                      )}

                      <h3 className="mt-2 text-xl font-semibold leading-snug text-[#17212b]">
                        {service.name}
                      </h3>

                      <p className="mt-3 text-sm leading-6 text-[#5e6873]">
                        {service.shortDescription || service.description?.slice(0, 140) + '...'}
                      </p>
                    </div>

                    <div className="mt-8 border-t border-[#f1f3f5] pt-5">
                      <Link
                        href={`/services/${service.slug}`}
                        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#315d7a] transition hover:text-[#c58a2a]"
                      >
                        Explore Service Details <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {/* Bottom Inquire Card */}
            <div className="mt-16 border border-[#315d7a] bg-[#17212b] p-8 sm:p-12 text-white">
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:items-center">
                <div className="lg:col-span-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d4a04d]">
                    Tender & Contract Inquiries
                  </span>
                  <h3 className="mt-2 text-2xl font-semibold sm:text-3xl">
                    Need technical specifications or execution capability for a pending project?
                  </h3>
                  <p className="mt-3 text-sm text-[#b9c3c9]">
                    Discuss bill of quantities (BOQ), civil engineering requirements, or joint venture arrangements with our estimating engineers.
                  </p>
                </div>
                <div className="flex lg:justify-end">
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-2.5 bg-[#c58a2a] px-6 py-4 text-xs font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-[#af7921]"
                  >
                    Request a Consultation <ArrowRight className="h-4 w-4" />
                  </Link>
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
