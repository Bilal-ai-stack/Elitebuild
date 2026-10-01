import type { Metadata } from 'next'
import Link from 'next/link'
import { getPublicProjects } from '@/lib/services/projects'
import { getPublicCompany } from '@/lib/services/company'
import { PublicHeader } from '@/components/public-header'
import { PublicFooter } from '@/components/public-footer'
import prisma from '@/lib/db/prisma'
import { FolderKanban, MapPin, ArrowRight, ChevronRight, Check } from 'lucide-react'

import { constructMetadata } from '@/lib/seo/config'
import { generateBreadcrumbSchema } from '@/lib/seo/structured-data'
import { JsonLd } from '@/components/seo/json-ld'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = constructMetadata({
  title: 'Projects',
  description:
    'Documented civil engineering and construction contracts completed and undertaken by M/S ELITE CONSTRUCTION COMPANY across Pakistan.',
  pathname: '/projects',
})

interface Props {
  searchParams: Promise<{ category?: string }>
}

export default async function ProjectsPage({ searchParams }: Props) {
  const { category: selectedCategory } = await searchParams
  let categories: Array<{ id: string; name: string; slug: string }> = []
  try {
    categories = await prisma.projectCategory.findMany({
      where: { active: true },
      orderBy: { displayOrder: 'asc' },
    })
  } catch {
    categories = []
  }

  const [projects, company] = await Promise.all([
    getPublicProjects({ categorySlug: selectedCategory }),
    getPublicCompany(),
  ])

  const breadcrumbs = generateBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Projects', path: '/projects' },
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
              <span className="text-[#315d7a]">Projects</span>
            </div>

            <div className="mt-6 max-w-3xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#315d7a]">
                Documented Execution
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                Civil infrastructure & building contracts.
              </h1>
              <p className="mt-6 text-base leading-8 text-[#5e6873]">
                A documented track record across roads, bridges, public institutions, utilities, and rehabilitation works delivered for communication departments, military engineering services, and municipal authorities.
              </p>
            </div>

            {/* Category Filter Pills */}
            {categories.length > 0 && (
              <div className="mt-10 flex flex-wrap items-center gap-2 pt-4 border-t border-[#f1f3f5]">
                <Link
                  href="/projects"
                  className={`border px-3.5 py-2 text-xs font-semibold transition ${
                    !selectedCategory
                      ? 'border-[#315d7a] bg-[#315d7a] text-white'
                      : 'border-[#d3dce1] bg-white text-[#5e6873] hover:border-[#315d7a]'
                  }`}
                >
                  All Categories
                </Link>
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/projects?category=${encodeURIComponent(cat.slug)}`}
                    className={`border px-3.5 py-2 text-xs font-semibold transition ${
                      selectedCategory === cat.slug
                        ? 'border-[#315d7a] bg-[#315d7a] text-white'
                        : 'border-[#d3dce1] bg-white text-[#5e6873] hover:border-[#315d7a]'
                    }`}
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Project Grid */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            {projects.length === 0 ? (
              <div className="border border-[#e7ebef] bg-white p-16 text-center">
                <FolderKanban className="mx-auto h-12 w-12 text-[#9aa3ab]" />
                <h3 className="mt-4 text-xl font-semibold text-[#17212b]">
                  {selectedCategory ? 'No Projects Found in this Category' : 'Projects Catalog Being Prepared'}
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-[#5e6873]">
                  {selectedCategory
                    ? 'Try selecting "All Categories" to view all documented projects across our disciplines.'
                    : 'Our historical and recent contract profiles are currently undergoing administrative verification for public listing.'}
                </p>
                <div className="mt-6 flex justify-center gap-4">
                  {selectedCategory && (
                    <Link
                      href="/projects"
                      className="border border-[#d9dee4] bg-white px-5 py-2.5 text-xs font-semibold text-[#315d7a]"
                    >
                      Clear Category Filter
                    </Link>
                  )}
                  <Link
                    href="/contact"
                    className="bg-[#c58a2a] px-5 py-2.5 text-xs font-semibold text-white"
                  >
                    Inquire for Specific Experience
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project, index) => {
                  const displayImg = project.coverImageUrl || project.images?.[0]?.imageUrl

                  return (
                    <article
                      key={project.id}
                      className="flex flex-col overflow-hidden border border-[#dfe5e8] bg-white transition hover:border-[#315d7a] hover:shadow-lg"
                    >
                      {/* Image Area */}
                      <div className="relative h-56 w-full overflow-hidden bg-[#eef2f4]">
                        {displayImg ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={displayImg}
                            alt={project.title}
                            className="h-full w-full object-cover transition duration-300 hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center text-[#8b969f]">
                            <FolderKanban className="h-10 w-10 text-[#c9d5db]" />
                            <span className="mt-2 text-[10px] font-bold uppercase tracking-wider text-[#9aa3ab]">
                              Verified Contract Record
                            </span>
                          </div>
                        )}
                        {project.category && (
                          <span className="absolute left-4 top-4 bg-[#17212b]/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur">
                            {project.category.name}
                          </span>
                        )}
                        <span className="absolute right-4 top-4 bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-[#5e6873]">
                          #{index + 1}
                        </span>
                      </div>

                      {/* Content Area */}
                      <div className="flex flex-1 flex-col justify-between p-6">
                        <div>
                          {project.location && (
                            <p className="flex items-center gap-1.5 text-xs text-[#5e6873]">
                              <MapPin className="h-3.5 w-3.5 shrink-0 text-[#c58a2a]" />
                              <span>{project.location}</span>
                            </p>
                          )}

                          <h3 className="mt-3 text-lg font-semibold leading-snug text-[#17212b]">
                            {project.title}
                          </h3>

                          {project.shortDescription && (
                            <p className="mt-2 text-xs leading-5 text-[#5e6873] line-clamp-3">
                              {project.shortDescription}
                            </p>
                          )}

                          {project.clientOrganization && (
                            <p className="mt-3 text-[11px] text-[#7d8790]">
                              <span className="font-semibold text-[#5e6873]">Client:</span> {project.clientOrganization}
                            </p>
                          )}
                        </div>

                        <div className="mt-6 flex items-center justify-between border-t border-[#f1f3f5] pt-4">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#3d7a5a]">
                            <Check className="h-3 w-3" /> {project.status.replace('_', ' ')}
                          </span>

                          <Link
                            href={`/projects/${project.slug || project.id}`}
                            className="inline-flex items-center gap-1 text-xs font-bold text-[#315d7a] transition hover:text-[#c58a2a]"
                          >
                            Details <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      <PublicFooter company={company} />
    </div>
  )
}
