'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HardHat, Menu, X, ArrowRight, Phone, Search } from 'lucide-react'
import { createWhatsAppLink, isWhatsAppConfigured } from '@/lib/services/whatsapp'
import { KnowledgeSearchModal } from '@/components/rag/knowledge-search-modal'

interface PublicHeaderProps {
  company?: {
    displayName?: string | null
    whatsapp?: string | null
    phonePrimary?: string | null
  }
}

export function PublicHeader({ company }: PublicHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const pathname = usePathname()

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'About', href: '/about' },
    { label: 'Services', href: '/services' },
    { label: 'Projects', href: '/projects' },
    { label: 'Capabilities', href: '/capabilities' },
    { label: 'Team', href: '/team' },
    { label: 'Equipment', href: '/equipment' },
    { label: 'Credentials', href: '/credentials' },
    { label: 'Contact', href: '/contact' },
  ]

  const hasWhatsApp = isWhatsAppConfigured(company?.whatsapp)
  const whatsappUrl = hasWhatsApp ? createWhatsAppLink(company!.whatsapp!, 'Hello, I would like to inquire about ELITEBUILD engineering and construction services.') : ''

  return (
    <header className="sticky top-0 z-30 border-b border-[#dfe5e8] bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3" aria-label="Elite Construction Company home">
          <span className="flex h-9 w-9 items-center justify-center bg-[#c58a2a] text-white">
            <HardHat className="h-5 w-5" />
          </span>
          <div>
            <span className="block text-[13px] font-bold tracking-[0.16em] text-[#17212b]">
              {company?.displayName || 'ELITE CONSTRUCTION'}
            </span>
            <span className="block text-[9px] uppercase tracking-[0.12em] text-[#5e6873]">
              Engineers & Constructors
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-6 text-xs font-semibold uppercase tracking-wider text-[#5e6873] xl:gap-7 lg:flex">
          {navLinks.map((link) => {
            const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`transition hover:text-[#315d7a] ${
                  isActive ? 'text-[#315d7a] underline decoration-[#c58a2a] decoration-2 underline-offset-8' : ''
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        {/* Action Buttons */}
        <div className="hidden items-center gap-3 sm:flex">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="inline-flex items-center gap-1.5 border border-[#315d7a]/30 bg-[#315d7a]/10 px-3 py-2 text-xs font-semibold text-[#315d7a] transition hover:bg-[#315d7a] hover:text-white"
            aria-label="Search verified company records"
          >
            <Search className="h-3.5 w-3.5" /> Search Records
          </button>
          {hasWhatsApp && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 border border-[#3d7a5a]/30 bg-[#3d7a5a]/10 px-3 py-2 text-xs font-semibold text-[#3d7a5a] transition hover:bg-[#3d7a5a] hover:text-white"
            >
              <Phone className="h-3.5 w-3.5" /> WhatsApp
            </a>
          )}
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 bg-[#17212b] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#263747]"
          >
            Contact Us <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-2 text-[#17212b] lg:hidden"
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {menuOpen && (
        <nav id="mobile-navigation" aria-label="Mobile navigation" className="border-t border-[#e4e8eb] bg-white px-6 py-6 shadow-xl lg:hidden">
          <div className="flex flex-col gap-4 text-sm font-semibold text-[#315d7a]">
            {navLinks.map((link) => {
              const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`py-1 transition hover:text-[#c58a2a] ${
                    isActive ? 'font-bold text-[#c58a2a]' : 'text-[#17212b]'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-[#e4e8eb] pt-5">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false)
                setSearchOpen(true)
              }}
              className="flex items-center justify-center gap-2 border border-[#315d7a] bg-[#315d7a]/10 py-2.5 text-xs font-semibold text-[#315d7a]"
            >
              <Search className="h-4 w-4" /> Search Verified Records
            </button>
            {hasWhatsApp && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-center gap-2 border border-[#3d7a5a] bg-[#3d7a5a]/10 py-2.5 text-xs font-semibold text-[#3d7a5a]"
              >
                <Phone className="h-4 w-4" /> Direct WhatsApp Chat
              </a>
            )}
            <Link
              href="/contact"
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center gap-2 bg-[#17212b] py-3 text-xs font-semibold text-white"
            >
              Request a Consultation <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </nav>
      )}

      {/* Verified Knowledge Search Modal */}
      <KnowledgeSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  )
}
