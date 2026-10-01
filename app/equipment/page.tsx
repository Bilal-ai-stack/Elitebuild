import type { Metadata } from 'next'
import Link from 'next/link'
import { getPublicEquipment } from '@/lib/services/content'
import { getPublicCompany } from '@/lib/services/company'
import { PublicHeader } from '@/components/public-header'
import { PublicFooter } from '@/components/public-footer'
import { Truck, Check, ArrowRight, Settings } from 'lucide-react'

import { constructMetadata } from '@/lib/seo/config'
import { generateBreadcrumbSchema } from '@/lib/seo/structured-data'
import { JsonLd } from '@/components/seo/json-ld'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = constructMetadata({
  title: 'Machinery & Equipment Fleet',
  description:
    'Heavy construction machinery, earthwork equipment, road rollers, asphalt pavers, and support fleet maintained by M/S ELITE CONSTRUCTION COMPANY.',
  pathname: '/equipment',
})

export default async function EquipmentPage() {
  const [equipment, company] = await Promise.all([
    getPublicEquipment(),
    getPublicCompany(),
  ])

  const breadcrumbs = generateBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Equipment', path: '/equipment' },
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
              <span className="text-[#315d7a]">Equipment</span>
            </div>

            <div className="mt-6 max-w-3xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c58a2a]">
                Plant & Fleet Inventory
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                Machinery & construction equipment.
              </h1>
              <p className="mt-6 text-base leading-8 text-[#5e6873]">
                Direct ownership and access to heavy earthmoving machinery, road rollers, asphalt pavers, concrete batching equipment, and logistical support vehicles ensures rapid mobilization for high-priority infrastructure contracts.
              </p>
            </div>
          </div>
        </section>

        {/* Equipment Grid */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            {equipment.length === 0 ? (
              <div className="border border-[#e7ebef] bg-white p-16 text-center">
                <Truck className="mx-auto h-12 w-12 text-[#9aa3ab]" />
                <h3 className="mt-4 text-xl font-semibold text-[#17212b]">Equipment Fleet Registry</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-[#5e6873]">
                  Our active plant inventory is verified periodically against active mobilization schedules. For a complete machinery log for tender pre-qualification, please contact our logistics department.
                </p>
                <Link
                  href="/contact?subject=Machinery%20and%20Fleet%20Inquiry"
                  className="mt-6 inline-flex items-center gap-2 bg-[#315d7a] px-5 py-2.5 text-xs font-semibold text-white"
                >
                  Request Equipment Schedule &rarr;
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {equipment.map((item) => (
                  <article
                    key={item.id}
                    className="flex flex-col justify-between border border-[#dfe5e8] bg-white p-6 shadow-sm transition hover:border-[#315d7a] hover:shadow-md"
                  >
                    <div>
                      {item.imageUrl && (
                        <div className="mb-5 overflow-hidden border border-[#e7ebef] bg-[#f7f8fa]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-44 w-full object-cover"
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        {item.category && (
                          <span className="bg-[#f1f3f5] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#5e6873]">
                            {item.category}
                          </span>
                        )}
                        {item.status && (
                          <span className="text-[10px] font-semibold text-[#3d7a5a]">
                            {item.status}
                          </span>
                        )}
                      </div>

                      <h3 className="mt-3 text-lg font-semibold text-[#17212b]">
                        {item.name}
                      </h3>

                      {item.description && (
                        <p className="mt-2 text-xs leading-5 text-[#5e6873]">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-6 border-t border-[#f1f3f5] pt-4">
                      {item.quantity != null && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#5e6873]">Verified Available Units:</span>
                          <span className="font-bold text-[#17212b]">{item.quantity}</span>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}

            {/* Inquire Footer */}
            <div className="mt-16 border border-[#dfe5e8] bg-white p-8 sm:p-10">
              <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-lg font-semibold text-[#17212b]">Need a machinery deployment schedule for bidding?</h3>
                  <p className="mt-1 text-sm text-[#5e6873]">We provide stamped machinery and plant schedules for government and institutional tenders.</p>
                </div>
                <Link
                  href="/contact?subject=Machinery%20Deployment%20Schedule%20Inquiry"
                  className="inline-flex items-center gap-2 bg-[#c58a2a] px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#af7921]"
                >
                  Contact Equipment Office <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter company={company} />
    </div>
  )
}
