import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

import { getBaseUrl, SEO_DEFAULTS } from '@/lib/seo/config'

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: {
    default: SEO_DEFAULTS.defaultTitle,
    template: SEO_DEFAULTS.titleTemplate,
  },
  description: SEO_DEFAULTS.defaultDescription,
  applicationName: SEO_DEFAULTS.companyName,
  authors: [{ name: SEO_DEFAULTS.companyName }],
  generator: 'Next.js',
  keywords: [
    'ELITE CONSTRUCTION COMPANY',
    'Civil Engineering',
    'Road Construction',
    'Bridge Structures',
    'Building Construction',
    'Infrastructure Pakistan',
    'Project Management',
    'Contractor Pakistan',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: SEO_DEFAULTS.defaultTitle,
    description: SEO_DEFAULTS.defaultDescription,
    url: getBaseUrl(),
    siteName: SEO_DEFAULTS.companyName,
    locale: SEO_DEFAULTS.locale,
    type: 'website',
    images: [
      {
        url: `${getBaseUrl()}${SEO_DEFAULTS.socialShareImage}`,
        width: 1200,
        height: 630,
        alt: SEO_DEFAULTS.defaultTitle,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SEO_DEFAULTS.defaultTitle,
    description: SEO_DEFAULTS.defaultDescription,
    images: [`${getBaseUrl()}${SEO_DEFAULTS.socialShareImage}`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/icon.svg',
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
