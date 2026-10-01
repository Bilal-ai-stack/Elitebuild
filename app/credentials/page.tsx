import type { Metadata } from 'next'
import Link from 'next/link'
import { getPublicCredentials } from '@/lib/services/content'
import { getPublicCompany } from '@/lib/services/company'
import { getPublicPerformanceCertificates } from '@/lib/services/performance-certificates'
import { PublicHeader } from '@/components/public-header'
import { PublicFooter } from '@/components/public-footer'
import { Award, ShieldCheck, Calendar, ArrowRight, FileCheck, FileCheck2, Building2 } from 'lucide-react'

import { constructMetadata } from '@/lib/seo/config'
import { generateBreadcrumbSchema } from '@/lib/seo/structured-data'
import { JsonLd } from '@/components/seo/json-ld'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = constructMetadata({
  title: 'Credentials',
  description:
    'Verified statutory registrations, engineering council licenses, government contractor pre-qualifications, and certifications of M/S ELITE CONSTRUCTION COMPANY.',
  pathname: '/credentials',
})

export default async function CredentialsPage() {
  const [credentials, company, performanceCerts] = await Promise.all([
    getPublicCredentials(),
    getPublicCompany(),
    getPublicPerformanceCertificates(),
  ])

  const breadcrumbs = generateBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Credentials', path: '/credentials' },
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
              <span className="text-[#315d7a]">Credentials</span>
            </div>

            <div className="mt-6 max-w-3xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#315d7a]">
                Statutory Compliance
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                Credentials & contractor registrations.
              </h1>
              <p className="mt-6 text-base leading-8 text-[#5e6873]">
                M/S ELITE CONSTRUCTION COMPANY maintains full statutory compliance and verified pre-qualifications across government engineering departments, communication agencies, and municipal development authorities.
              </p>
            </div>
          </div>
        </section>

        {/* Credentials Grid */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            {credentials.length === 0 ? (
              <div className="border border-[#e7ebef] bg-white p-16 text-center">
                <Award className="mx-auto h-12 w-12 text-[#9aa3ab]" />
                <h3 className="mt-4 text-xl font-semibold text-[#17212b]">Statutory Registry Verification</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-[#5e6873]">
                  Certified registration dossiers (PEC, C&W, MES, and tax compliance certificates) are available to client departments and tendering authorities upon formal request.
                </p>
                <Link
                  href="/contact?subject=Statutory%20Registrations%20Dossier%20Request"
                  className="mt-6 inline-flex items-center gap-2 bg-[#315d7a] px-5 py-2.5 text-xs font-semibold text-white"
                >
                  Request Registration Dossier &rarr;
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {credentials.map((cred) => (
                  <article
                    key={cred.id}
                    className="flex flex-col justify-between border border-[#dfe5e8] bg-white p-7 shadow-sm transition hover:border-[#315d7a] hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="flex h-10 w-10 items-center justify-center bg-[#edf3f5] text-[#315d7a]">
                          <Award className="h-5 w-5" />
                        </span>
                        <span className="flex items-center gap-1 rounded bg-[#3d7a5a]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#3d7a5a]">
                          <ShieldCheck className="h-3 w-3" /> Verified Record
                        </span>
                      </div>

                      <h3 className="mt-5 text-lg font-semibold leading-snug text-[#17212b]">
                        {cred.title}
                      </h3>

                      {cred.issuingOrganization && (
                        <p className="mt-2 text-xs font-medium text-[#c58a2a]">
                          Issuing Authority: {cred.issuingOrganization}
                        </p>
                      )}

                      {cred.credentialNumber && (
                        <p className="mt-1 font-mono text-[11px] text-[#5e6873]">
                          Reg / License: {cred.credentialNumber}
                        </p>
                      )}

                      {cred.description && (
                        <p className="mt-3 text-xs leading-5 text-[#5e6873]">
                          {cred.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-6 border-t border-[#f1f3f5] pt-4">
                      {(cred.issueDate || cred.expiryDate) && (
                        <p className="flex items-center gap-1.5 text-[11px] text-[#8b969f]">
                          <Calendar className="h-3.5 w-3.5 text-[#315d7a]" />
                          <span>
                            {cred.issueDate && `Issued: ${new Date(cred.issueDate).getFullYear()}`}
                            {cred.issueDate && cred.expiryDate ? ' · ' : ''}
                            {cred.expiryDate ? `Valid until: ${new Date(cred.expiryDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}` : 'Active status'}
                          </span>
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}

            {/* Client Performance & Completion Certificates */}
            {performanceCerts.length > 0 && (
              <div className="mt-16">
                <div className="border-t border-[#dfe5e8] pt-12">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#315d7a]">
                    Verified Performance
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#17212b]">
                    Client Performance & Completion Certificates
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-[#5e6873]">
                    Documented project completion certificates and formal performance evaluations issued by client departments and authorities.
                  </p>

                  <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {performanceCerts.map((cert) => (
                      <article
                        key={cert.id}
                        className="flex flex-col justify-between border border-[#dfe5e8] bg-white p-7 shadow-sm transition hover:border-[#315d7a] hover:shadow-md"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="flex h-10 w-10 items-center justify-center bg-[#edf3f5] text-[#315d7a]">
                              <FileCheck2 className="h-5 w-5" />
                            </span>
                            <span className="flex items-center gap-1 rounded bg-[#3d7a5a]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#3d7a5a]">
                              <ShieldCheck className="h-3 w-3" /> Verified Certificate
                            </span>
                          </div>

                          <h3 className="mt-5 text-lg font-semibold leading-snug text-[#17212b]">
                            {cert.title}
                          </h3>

                          {cert.issuedBy && (
                            <p className="mt-2 text-xs font-medium text-[#c58a2a]">
                              Issued By: {cert.issuedBy.name} {cert.issuedBy.shortName ? `(${cert.issuedBy.shortName})` : ''}
                            </p>
                          )}

                          {cert.project && (
                            <p className="mt-1 text-xs text-[#5e6873]">
                              Contract: <Link href={`/projects/${cert.project.slug || cert.project.id}`} className="text-[#315d7a] hover:underline">{cert.project.title}</Link>
                            </p>
                          )}

                          {cert.description && (
                            <p className="mt-3 text-xs leading-5 text-[#5e6873]">
                              {cert.description}
                            </p>
                          )}
                        </div>

                        <div className="mt-6 border-t border-[#f1f3f5] pt-4">
                          {cert.issueDate && (
                            <p className="flex items-center gap-1.5 text-[11px] text-[#8b969f]">
                              <Calendar className="h-3.5 w-3.5 text-[#315d7a]" />
                              <span>
                                Issued: {new Date(cert.issueDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                              </span>
                            </p>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Document Access Policy Note */}
            <div className="mt-16 border border-[#d9dee4] bg-white p-8">
              <div className="flex items-start gap-4">
                <FileCheck className="mt-0.5 h-6 w-6 shrink-0 text-[#315d7a]" />
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-[#17212b]">
                    Official Document Access Policy
                  </h4>
                  <p className="mt-1.5 text-xs leading-6 text-[#5e6873]">
                    Original tax returns, audited balance sheets, PEC engineer enrollment lists, and signed contract agreements are classified institutional records and provided exclusively to verified tendering authorities via official corporate channels.
                  </p>
                  <Link
                    href="/contact?subject=Official%20Documentation%20Verification%20Request"
                    className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#315d7a] hover:underline"
                  >
                    Request Certified Documentation for Pre-Qualification &rarr;
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
