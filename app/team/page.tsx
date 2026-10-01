import type { Metadata } from 'next'
import Link from 'next/link'
import { getPublicTeamMembers } from '@/lib/services/team'
import { getPublicCompany } from '@/lib/services/company'
import { PublicHeader } from '@/components/public-header'
import { PublicFooter } from '@/components/public-footer'
import { Users, HardHat, ShieldCheck, ArrowRight, Award } from 'lucide-react'

import { constructMetadata } from '@/lib/seo/config'
import { generateBreadcrumbSchema } from '@/lib/seo/structured-data'
import { JsonLd } from '@/components/seo/json-ld'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = constructMetadata({
  title: 'Engineering Team & Leadership',
  description:
    'Leadership, qualified engineers, site supervisors, and project management personnel of M/S ELITE CONSTRUCTION COMPANY.',
  pathname: '/team',
})

export default async function TeamPage() {
  const [teamMembers, company] = await Promise.all([
    getPublicTeamMembers(),
    getPublicCompany(),
  ])

  const breadcrumbs = generateBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Team', path: '/team' },
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
              <span className="text-[#315d7a]">Team</span>
            </div>

            <div className="mt-6 max-w-3xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#315d7a]">
                Professional Personnel
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                Engineering team & key leadership.
              </h1>
              <p className="mt-6 text-base leading-8 text-[#5e6873]">
                Our civil and construction contracts are directed by qualified engineers, experienced project managers, and seasoned field supervisors committed to structural integrity, safety, and timely project delivery.
              </p>
            </div>
          </div>
        </section>

        {/* Team Grid */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            {teamMembers.length === 0 ? (
              <div className="border border-[#e7ebef] bg-white p-16 text-center">
                <Users className="mx-auto h-12 w-12 text-[#9aa3ab]" />
                <h3 className="mt-4 text-xl font-semibold text-[#17212b]">Technical Personnel Registry</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-[#5e6873]">
                  Project staffing lists and Pakistan Engineering Council (PEC) registered engineer credentials are submitted tailored to specific client tender packages.
                </p>
                <Link
                  href="/contact?subject=Engineering%20Personnel%20Roster%20Request"
                  className="mt-6 inline-flex items-center gap-2 bg-[#315d7a] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#264a63]"
                >
                  Request Technical Staffing Dossier &rarr;
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                {teamMembers.map((member) => (
                  <article
                    key={member.id}
                    className="flex flex-col justify-between border border-[#dfe5e8] bg-white p-7 shadow-sm transition hover:border-[#315d7a] hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded bg-[#edf3f5] text-base font-bold text-[#315d7a]">
                          {member.photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={member.photoUrl} alt={member.name} className="h-full w-full object-cover" />
                          ) : (
                            member.name
                              .split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-[#17212b]">{member.name}</h3>
                          {member.title && (
                            <p className="text-xs font-medium text-[#c58a2a]">{member.title}</p>
                          )}
                          {member.department && (
                            <p className="text-[11px] text-[#5e6873]">{member.department}</p>
                          )}
                        </div>
                      </div>

                      {member.bio && (
                        <div className="mt-5 border-t border-[#f1f3f5] pt-4">
                          <p className="text-xs leading-6 text-[#5e6873]">{member.bio}</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 flex items-center justify-between border-t border-[#f1f3f5] pt-4 text-[11px] text-[#8b969f]">
                      <span className="flex items-center gap-1 text-[#3d7a5a]">
                        <ShieldCheck className="h-3.5 w-3.5" /> Verified Staff
                      </span>
                      <span>M/S ELITE CONST. CO.</span>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {/* Engineering Standard Policy Note */}
            <div className="mt-16 border border-[#d9dee4] bg-white p-8">
              <div className="flex items-start gap-4">
                <HardHat className="mt-0.5 h-6 w-6 shrink-0 text-[#315d7a]" />
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-[#17212b]">
                    PEC Professional Compliance & Job-Site Supervision
                  </h4>
                  <p className="mt-1.5 text-xs leading-6 text-[#5e6873]">
                    In accordance with Pakistan Engineering Council (PEC) regulations and government contract stipulations, all construction works are supervised on-site by accredited graduate civil engineers and certified safety personnel.
                  </p>
                  <Link
                    href="/credentials"
                    className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#315d7a] hover:underline"
                  >
                    View Statutory Licenses & Pre-qualifications &rarr;
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
