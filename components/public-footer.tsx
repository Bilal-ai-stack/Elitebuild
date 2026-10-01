import Link from 'next/link'
import { HardHat, Phone, Mail, MapPin } from 'lucide-react'

interface PublicFooterProps {
  company?: {
    displayName?: string | null
    legalName?: string | null
    tagline?: string | null
    establishedYear?: number | null
    addressPrimary?: string | null
    addressSecondary?: string | null
    city?: string | null
    province?: string | null
    country?: string | null
    email?: string | null
    phonePrimary?: string | null
    whatsapp?: string | null
  }
}

export function PublicFooter({ company }: PublicFooterProps) {
  const currentYear = new Date().getFullYear()
  const estYear = company?.establishedYear || 2006
  const displayName = company?.displayName || 'ELITE CONSTRUCTION COMPANY'

  return (
    <footer className="border-t border-[#2a3843] bg-[#17212b] text-white">
      <div className="mx-auto max-w-7xl px-6 py-14 lg:px-10">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Company Identity */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center bg-[#c58a2a] text-white">
                <HardHat className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-bold tracking-[0.16em] text-white">{displayName}</p>
                <p className="text-[10px] text-[#aeb8bf]">Engineers & Constructors</p>
              </div>
            </div>
            <p className="text-xs leading-6 text-[#9ba8b0]">
              {company?.tagline || 'An established engineering and construction organization delivering civil infrastructure, structural buildings, and project management excellence.'}
            </p>
            <p className="text-[11px] font-semibold text-[#c58a2a]">
              Established in {estYear} · Pakistan
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-[#c58a2a]">
              Navigation
            </h4>
            <ul className="space-y-2.5 text-xs text-[#b9c3c9]">
              <li><Link href="/" className="transition hover:text-white">Home</Link></li>
              <li><Link href="/about" className="transition hover:text-white">About Organization</Link></li>
              <li><Link href="/services" className="transition hover:text-white">Civil & Construction Services</Link></li>
              <li><Link href="/projects" className="transition hover:text-white">Selected Projects</Link></li>
              <li><Link href="/capabilities" className="transition hover:text-white">Core Capabilities</Link></li>
              <li><Link href="/team" className="transition hover:text-white">Engineering Team</Link></li>
              <li><Link href="/equipment" className="transition hover:text-white">Machinery & Fleet</Link></li>
              <li><Link href="/credentials" className="transition hover:text-white">Credentials & Licensure</Link></li>
              <li><Link href="/contact" className="transition hover:text-white">Contact & Inquiries</Link></li>
            </ul>
          </div>

          {/* Documented Locations */}
          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-[#c58a2a]">
              Documented Offices
            </h4>
            <div className="space-y-3 text-xs text-[#b9c3c9]">
              {company?.addressPrimary && (
                <div className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#c58a2a]" />
                  <p>{company.addressPrimary}</p>
                </div>
              )}
              {company?.addressSecondary && (
                <div className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#c58a2a]" />
                  <p>{company.addressSecondary}</p>
                </div>
              )}
              {!company?.addressPrimary && !company?.addressSecondary && (
                <p className="leading-6">
                  Islamabad · Hamza Tower, F-11 Markaz<br />
                  Peshawar · Jawad Tower, University Road
                </p>
              )}
              {(company?.city || company?.country) && (
                <p className="text-[11px] text-[#7d8c95]">
                  {[company?.city, company?.province, company?.country].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          </div>

          {/* Contact Direct */}
          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-[#c58a2a]">
              Contact Channels
            </h4>
            <div className="space-y-3 text-xs text-[#b9c3c9]">
              {company?.email ? (
                <div className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 shrink-0 text-[#c58a2a]" />
                  <a href={`mailto:${company.email}`} className="transition hover:text-white">{company.email}</a>
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 shrink-0 text-[#c58a2a]" />
                  <Link href="/contact" className="transition hover:text-white">Direct Inquiry Form</Link>
                </div>
              )}

              {company?.phonePrimary && (
                <div className="flex items-center gap-2.5">
                  <Phone className="h-4 w-4 shrink-0 text-[#c58a2a]" />
                  <a href={`tel:${company.phonePrimary}`} className="transition hover:text-white">{company.phonePrimary}</a>
                </div>
              )}

              {company?.whatsapp && (
                <div className="flex items-center gap-2.5 text-[#3d7a5a]">
                  <Phone className="h-4 w-4 shrink-0" />
                  <span>WhatsApp: {company.whatsapp}</span>
                </div>
              )}

              <div className="pt-2">
                <Link
                  href="/admin/login"
                  className="inline-block text-[11px] text-[#697984] transition hover:text-[#b9c3c9]"
                >
                  Admin / Staff Portal &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[#23313b] pt-8 text-[11px] text-[#7a8a94] sm:flex-row">
          <p>© {currentYear} {displayName}. All rights reserved.</p>
          <p>M/S ELITE CONSTRUCTION COMPANY · Engineers, Constructors & Project Managers</p>
        </div>
      </div>
    </footer>
  )
}
