// =============================================================================
// ELITEBUILD — Accessible 404 Not Found Page
// =============================================================================
// Renders clean, on-brand 404 page for nonexistent resources.
// Explicitly instructs search engines not to index broken or missing URLs.
// =============================================================================

import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Home, FileQuestion } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Page Not Found | ELITE CONSTRUCTION COMPANY',
  description: 'The requested resource could not be found.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f7f8fa] px-6 text-[#17212b]">
      <div className="w-full max-w-md rounded-lg border border-[#dfe5e8] bg-white p-8 text-center shadow-sm sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f1f4f6] text-[#315d7a]">
          <FileQuestion className="h-7 w-7" />
        </div>

        <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-[#c58a2a]">
          404 Error
        </p>

        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#17212b] sm:text-3xl">
          Page Not Found
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-[#5e6873]">
          The page or documented engineering record you are looking for does not exist or has been relocated.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded bg-[#0b2545] px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-[#133966]"
          >
            <Home className="h-4 w-4" />
            Return Home
          </Link>
          <Link
            href="/projects"
            className="inline-flex items-center justify-center gap-2 rounded border border-[#dfe5e8] bg-white px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#17212b] transition hover:bg-[#f7f8fa]"
          >
            <ArrowLeft className="h-4 w-4" />
            View Projects
          </Link>
        </div>
      </div>
    </div>
  )
}
