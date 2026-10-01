import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPublicProjectByIdOrSlug, getRelatedProjects } from '@/lib/services/projects'
import { getPublicCompany } from '@/lib/services/company'
import { PublicHeader } from '@/components/public-header'
import { PublicFooter } from '@/components/public-footer'
import {
  MapPin, Calendar, Building, FileText, CheckCircle2,
  ArrowRight, ArrowLeft, Image as ImageIcon, Briefcase, Award, ShieldCheck
} from 'lucide-react'

import { constructMetadata } from '@/lib/seo/config'
import { generateBreadcrumbSchema, generateProjectWebPageSchema } from '@/lib/seo/structured-data'
import { JsonLd } from '@/components/seo/json-ld'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const project = await getPublicProjectByIdOrSlug(id)
  if (!project || project.contentStatus !== 'PUBLISHED') {
    return constructMetadata({
      title: 'Project Not Found',
      description: 'The requested engineering project could not be located.',
      pathname: `/projects/${id}`,
      noIndex: true,
    })
  }

  const coverImg = project.coverImageUrl || project.images?.[0]?.imageUrl

  return constructMetadata({
    title: project.title,
    description:
      project.shortDescription ||
      project.description?.slice(0, 160) ||
      `Engineering contract and execution details for ${project.title}.`,
    pathname: `/projects/${project.slug || project.id}`,
    image: coverImg,
  })
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params
  const [project, company] = await Promise.all([
    getPublicProjectByIdOrSlug(id),
    getPublicCompany(),
  ])

  if (!project || project.contentStatus !== 'PUBLISHED') {
    notFound()
  }

  const related = await getRelatedProjects(project.categoryId, project.id, 3)
  const images = project.images || []
  const coverImg = project.coverImageUrl || images[0]?.imageUrl

  const breadcrumbs = generateBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Projects', path: '/projects' },
    { name: project.title, path: `/projects/${project.slug || project.id}` },
  ])
  const projectSchema = generateProjectWebPageSchema(project)

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f8fa] text-[#17212b]">
      <JsonLd data={[breadcrumbs, projectSchema]} />
      <PublicHeader company={company} />

      <main className="flex-1">
        {/* Breadcrumb Header */}
        <section className="border-b border-[#dfe5e8] bg-white py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#5e6873]">
              <Link href="/" className="hover:text-[#315d7a]">Home</Link>
              <span>/</span>
              <Link href="/projects" className="hover:text-[#315d7a]">Projects</Link>
              <span>/</span>
              <span className="text-[#315d7a] line-clamp-1">{project.title}</span>
            </div>

            <div className="mt-6 max-w-4xl">
              <div className="flex flex-wrap items-center gap-3">
                {project.category && (
                  <span className="bg-[#17212b] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                    {project.category.name}
                  </span>
                )}
                <span className="border border-[#3d7a5a]/30 bg-[#3d7a5a]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#3d7a5a]">
                  {project.status.replace('_', ' ')}
                </span>
                {project.featured && (
                  <span className="border border-[#c58a2a]/30 bg-[#c58a2a]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#c58a2a]">
                    Featured Contract
                  </span>
                )}
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl lg:text-5xl">
                {project.title}
              </h1>

              {project.shortDescription && (
                <p className="mt-5 text-base leading-8 text-[#5e6873]">
                  {project.shortDescription}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Content & Specs */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-3 lg:gap-16">
              {/* Main Column */}
              <div className="lg:col-span-2 space-y-10">
                {/* Cover Image */}
                {coverImg && (
                  <div className="overflow-hidden border border-[#d9dee4] bg-[#eef2f4] shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coverImg}
                      alt={project.title}
                      className="h-80 w-full object-cover sm:h-[420px]"
                    />
                  </div>
                )}

                {/* Project Description */}
                <div className="border border-[#dfe5e8] bg-white p-8 sm:p-10 shadow-sm">
                  <h2 className="text-xl font-semibold text-[#17212b]">Contract & Execution Summary</h2>
                  <div className="mt-4 whitespace-pre-wrap text-sm leading-8 text-[#5e6873]">
                    {project.description || (
                      <p>
                        Project works executed by M/S ELITE CONSTRUCTION COMPANY according to engineering specifications, contractual terms, and approved architectural/structural designs.
                      </p>
                    )}
                  </div>

                  {project.scope && (
                    <div className="mt-8 border-t border-[#f1f3f5] pt-6">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-[#315d7a]">
                        Documented Scope of Work
                      </h3>
                      <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#5e6873]">
                        {project.scope}
                      </div>
                    </div>
                  )}
                </div>

                {/* Gallery Images if multiple */}
                {images.length > 0 && (
                  <div className="border border-[#dfe5e8] bg-white p-8 sm:p-10 shadow-sm">
                    <div className="flex items-center justify-between border-b border-[#f1f3f5] pb-4">
                      <h3 className="text-lg font-semibold text-[#17212b]">Project Documentation Gallery</h3>
                      <span className="text-xs text-[#5e6873]">{images.length} Photos</span>
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                      {images.map((img) => (
                        <div
                          key={img.id}
                          className="group relative overflow-hidden border border-[#e7ebef] bg-[#f7f8fa]"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img.imageUrl}
                            alt={img.altText || project.title}
                            className="h-44 w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                          {img.caption && (
                            <p className="bg-white/95 p-2 text-[11px] text-[#5e6873]">
                              {img.caption}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Verified Performance Certificates */}
                {project.certificates && project.certificates.length > 0 && (
                  <div className="border border-[#dfe5e8] bg-white p-8 sm:p-10 shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#315d7a]">
                      <Award className="h-4 w-4 text-[#c58a2a]" />
                      <span>Verified Client Completion & Performance</span>
                    </div>
                    <div className="mt-6 space-y-4">
                      {project.certificates.map((cert: any) => (
                        <div key={cert.id} className="border border-[#e7ebef] bg-[#fbfcfc] p-5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h4 className="font-semibold text-[#17212b]">{cert.title}</h4>
                            <span className="flex items-center gap-1 rounded bg-[#3d7a5a]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#3d7a5a]">
                              <ShieldCheck className="h-3 w-3" /> Verified Certificate
                            </span>
                          </div>
                          {cert.issuedBy && (
                            <p className="mt-1 text-xs font-medium text-[#c58a2a]">
                              Issued By: {cert.issuedBy.name} {cert.issuedBy.shortName ? `(${cert.issuedBy.shortName})` : ''}
                            </p>
                          )}
                          {cert.issueDate && (
                            <p className="mt-0.5 text-[11px] text-[#8b969f]">
                              Issue Date: {new Date(cert.issueDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                            </p>
                          )}
                          {cert.description && (
                            <p className="mt-2 text-xs leading-5 text-[#5e6873]">{cert.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Link
                    href="/projects"
                    className="inline-flex items-center gap-2 text-xs font-semibold text-[#5e6873] hover:text-[#315d7a]"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back to all projects
                  </Link>
                </div>
              </div>

              {/* Sidebar: Metadata & Related */}
              <div className="space-y-8">
                {/* Project Specs Card */}
                <div className="border border-[#d9dee4] bg-white p-6 shadow-sm">
                  <h3 className="border-b border-[#f1f3f5] pb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#315d7a]">
                    Project Specifications
                  </h3>

                  <dl className="mt-4 space-y-4 text-xs">
                    {project.location && (
                      <div>
                        <dt className="flex items-center gap-1.5 font-semibold text-[#5e6873]">
                          <MapPin className="h-3.5 w-3.5 text-[#c58a2a]" /> Location
                        </dt>
                        <dd className="mt-1 text-sm font-medium text-[#17212b]">{project.location}</dd>
                      </div>
                    )}

                    {project.clientOrganization && (
                      <div>
                        <dt className="flex items-center gap-1.5 font-semibold text-[#5e6873]">
                          <Building className="h-3.5 w-3.5 text-[#315d7a]" /> Client Organization
                        </dt>
                        <dd className="mt-1 text-sm font-medium text-[#17212b]">{project.clientOrganization}</dd>
                      </div>
                    )}

                    {project.category && (
                      <div>
                        <dt className="flex items-center gap-1.5 font-semibold text-[#5e6873]">
                          <Briefcase className="h-3.5 w-3.5 text-[#315d7a]" /> Category
                        </dt>
                        <dd className="mt-1 text-sm font-medium text-[#17212b]">{project.category.name}</dd>
                      </div>
                    )}

                    {project.contractType && (
                      <div>
                        <dt className="flex items-center gap-1.5 font-semibold text-[#5e6873]">
                          <FileText className="h-3.5 w-3.5 text-[#315d7a]" /> Contract Type
                        </dt>
                        <dd className="mt-1 text-sm font-medium text-[#17212b]">{project.contractType}</dd>
                      </div>
                    )}

                    {(project.startDate || project.completionDate) && (
                      <div>
                        <dt className="flex items-center gap-1.5 font-semibold text-[#5e6873]">
                          <Calendar className="h-3.5 w-3.5 text-[#315d7a]" /> Execution Timeline
                        </dt>
                        <dd className="mt-1 text-sm font-medium text-[#17212b]">
                          {project.startDate && new Date(project.startDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                          {project.startDate && project.completionDate ? ' — ' : ''}
                          {project.completionDate ? new Date(project.completionDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : 'Ongoing'}
                        </dd>
                      </div>
                    )}
                  </dl>

                  <div className="mt-6 border-t border-[#f1f3f5] pt-5">
                    <Link
                      href={`/contact?subject=${encodeURIComponent(`Inquiry regarding ${project.title}`)}`}
                      className="inline-flex w-full items-center justify-center gap-2 bg-[#315d7a] py-3 text-xs font-semibold text-white transition hover:bg-[#264a63]"
                    >
                      Inquire About Similar Works &rarr;
                    </Link>
                  </div>
                </div>

                {/* Related Projects */}
                {related.length > 0 && (
                  <div className="border border-[#d9dee4] bg-white p-6 shadow-sm">
                    <h3 className="border-b border-[#f1f3f5] pb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#5e6873]">
                      Related Experience
                    </h3>
                    <div className="mt-4 divide-y divide-[#f1f3f5]">
                      {related.map((item) => (
                        <Link
                          key={item.id}
                          href={`/projects/${item.slug || item.id}`}
                          className="group block py-3.5 transition"
                        >
                          <p className="text-sm font-semibold text-[#17212b] group-hover:text-[#315d7a]">
                            {item.title}
                          </p>
                          {item.location && (
                            <p className="mt-1 text-xs text-[#5e6873]">
                              {item.location}
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
