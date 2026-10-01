// =============================================================================
// ELITEBUILD — Admin Section Metadata Layout
// =============================================================================
// Ensures all administrative routes explicitly instruct web crawlers NOT to
// index or follow any internal portal or authentication pages.
// =============================================================================

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin Portal | ELITE CONSTRUCTION COMPANY',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
}

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
