import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPublicServiceBySlug, getRelatedServices } from '@/lib/services/services'
import { getPublicCompany } from '@/lib/services/company'
import { PublicHeader } from '@/components/public-header'
import { PublicFooter } from '@/components/public-footer'
import { Building2, ArrowRight, ChevronRight, CheckCircle2, ArrowLeft, Briefcase, MapPin } from 'lucide-react'
import prisma from '@/lib/db/prisma'

import { constructMetadata } from '@/lib/seo/config'
import { generateBreadcrumbSchema, generateServiceSchema } from '@/lib/seo/structured-data'
import { JsonLd } from '@/components/seo/json-ld'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const service = await getPublicServiceBySlug(slug)
  if (!service) {
    return constructMetadata({
      title: 'Service Not Found',
      description: 'The requested engineering service could not be located.',
      pathname: `/services/${slug}`,
      noIndex: true,
    })
  }

  return constructMetadata({
    title: service.name,
    description:
      service.shortDescription ||
      service.description?.slice(0, 160) ||
      `Civil engineering and construction details for ${service.name}.`,
    pathname: `/services/${service.slug}`,
    image: service.coverImageUrl,
  })
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params
  const [service, company] = await Promise.all([
    getPublicServiceBySlug(slug),
    getPublicCompany(),
  ])

  if (!service) {
    notFound()
  }

  const [related, relatedProjects] = await Promise.all([
    getRelatedServices(service.categoryId, service.id, 3),
    service.categoryId
      ? prisma.project.findMany({
          where: { categoryId: service.categoryId, contentStatus: 'PUBLISHED' },
          take: 3,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            slug: true,
            title: true,
            location: true,
            coverImageUrl: true,
            status: true,
          },
        })
      : Promise.resolve([]),
  ])

  const breadcrumbs = generateBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Services', path: '/services' },
    { name: service.name, path: `/services/${service.slug}` },
  ])
  const serviceSchema = generateServiceSchema(service)

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f8fa] text-[#17212b]">
      <JsonLd data={[breadcrumbs, serviceSchema]} />
      <PublicHeader company={company} />

      <main className="flex-1">
        {/* Breadcrumb Header */}
        <section className="border-b border-[#dfe5e8] bg-white py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#5e6873]">
              <Link href="/" className="hover:text-[#315d7a]">Home</Link>
              <span>/</span>
              <Link href="/services" className="hover:text-[#315d7a]">Services</Link>
              <span>/</span>
              <span className="text-[#315d7a]">{service.name}</span>
            </div>

            <div className="mt-6 max-w-3xl">
              {service.category && (
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c58a2a]">
                  {service.category.name}
                </span>
              )}
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
                {service.name}
              </h1>
              {service.shortDescription && (
                <p className="mt-5 text-base leading-8 text-[#5e6873]">
                  {service.shortDescription}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Content Body */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-3 lg:gap-16">
              {/* Main Content */}
              <div className="lg:col-span-2">
                <div className="border border-[#dfe5e8] bg-white p-8 sm:p-10 shadow-sm">
                  {service.coverImageUrl && (
                    <div className="mb-8 overflow-hidden border border-[#e7ebef]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={service.coverImageUrl}
                        alt={service.name}
                        className="h-72 w-full object-cover sm:h-96"
                      />
                    </div>
                  )}

                  <h2 className="text-xl font-semibold text-[#17212b]">Technical Scope & Execution Overview</h2>
                  <div className="mt-4 whitespace-pre-wrap text-sm leading-8 text-[#5e6873]">
                    {service.description || (
                      <p>
                        M/S ELITE CONSTRUCTION COMPANY provides turnkey technical coordination, structural engineering execution, machinery deployment, and quality management for this discipline. All works are conducted in compliance with relevant standard specifications, public-works guidelines, and client design requirements.
                      </p>
                    )}
                  </div>

                  <div className="mt-10 border-t border-[#f1f3f5] pt-8">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#315d7a]">Quality & Compliance Standards</h3>
                    <ul className="mt-4 space-y-3 text-sm text-[#5e6873]">
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-[#3d7a5a]" />
                        <span>Adherence to government agency (C&W, MES, PDA) technical specifications</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-[#3d7a5a]" />
                        <span>Certified materials testing (compaction, concrete cylinder crushing, asphalt tests)</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-[#3d7a5a]" />
                        <span>Full job-site safety, environmental compliance, and technical supervision</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Related Projects if available */}
                {relatedProjects.length > 0 && (
                  <div className="mt-10 border border-[#dfe5e8] bg-white p-8 sm:p-10 shadow-sm">
                    <div className="flex items-center justify-between border-b border-[#f1f3f5] pb-4">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c58a2a]">
                          Portfolio Reference
                        </span>
                        <h3 className="mt-1 text-lg font-semibold text-[#17212b]">
                          Related Executed Contracts
                        </h3>
                      </div>
                      <Link
                        href="/projects"
                        className="text-xs font-semibold text-[#315d7a] hover:underline"
                      >
                        All Projects →
                      </Link>
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {relatedProjects.map((proj) => (
                        <Link
                          key={proj.id}
                          href={`/projects/${proj.slug || proj.id}`}
                          className="group flex flex-col justify-between border border-[#e7ebef] bg-[#fbfcfc] p-4 transition hover:border-[#315d7a]"
                        >
                          <div>
                            {proj.coverImageUrl && (
                              <div className="mb-3 h-28 overflow-hidden bg-[#eef2f4]">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={proj.coverImageUrl}
                                  alt={proj.title}
                                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                                />
                              </div>
                            )}
                            <h4 className="text-sm font-semibold text-[#17212b] group-hover:text-[#315d7a] line-clamp-2">
                              {proj.title}
                            </h4>
                          </div>
                          <div className="mt-3 flex items-center justify-between border-t border-[#edf1f3] pt-2 text-[11px] text-[#5e6873]">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-[#c58a2a]" /> {proj.location}
                            </span>
                            <span className="font-semibold text-[#315d7a] group-hover:underline">
                              View →
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6">
                  <Link
                    href="/services"
                    className="inline-flex items-center gap-2 text-xs font-semibold text-[#5e6873] hover:text-[#315d7a]"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back to all services
                  </Link>
                </div>
              </div>

              {/* Sidebar: Inquiry & Related */}
              <div className="space-y-8">
                {/* CTA Card */}
                <div className="border border-[#315d7a] bg-[#17212b] p-8 text-white">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d4a04d]">
                    Inquire About This Service
                  </span>
                  <h3 className="mt-2 text-xl font-semibold">
                    Request an Engineering Consultation
                  </h3>
                  <p className="mt-3 text-xs leading-6 text-[#b9c3c9]">
                    Discuss Bill of Quantities, feasibility, equipment availability, or contractor pre-qualification for {service.name}.
                  </p>
                  <Link
                    href={`/contact?subject=${encodeURIComponent(`Inquiry: ${service.name}`)}`}
                    className="mt-6 inline-flex w-full items-center justify-center gap-2 bg-[#c58a2a] py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#af7921]"
                  >
                    Send Inquiry <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                {/* Related Services */}
                {related.length > 0 && (
                  <div className="border border-[#d9dee4] bg-white p-6">
                    <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[#5e6873]">
                      Related Services
                    </h3>
                    <div className="mt-4 divide-y divide-[#f1f3f5]">
                      {related.map((item) => (
                        <Link
                          key={item.id}
                          href={`/services/${item.slug}`}
                          className="group block py-3.5 transition"
                        >
                          <p className="text-sm font-semibold text-[#17212b] group-hover:text-[#315d7a]">
                            {item.name}
                          </p>
                          {item.shortDescription && (
                            <p className="mt-1 text-xs text-[#5e6873] line-clamp-2">
                              {item.shortDescription}
                            </p>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter company={company} />
    </div>
  )
}
