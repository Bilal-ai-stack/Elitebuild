// =============================================================================
// ELITEBUILD — Edge Middleware
// =============================================================================
// Protects /admin/* routes server-side (except login).
// Layout-level auth remains as a second layer.
// =============================================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const SESSION_COOKIE = 'elitebuild-session'

function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: AUTH_SECRET environment variable is missing in production environment.')
    }
    return new TextEncoder().encode('dev-secret-change-in-production')
  }
  return new TextEncoder().encode(secret)
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow login page without session
  if (pathname === '/admin/login' || pathname.startsWith('/admin/login/')) {
    return NextResponse.next()
  }

  if (!pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) {
    const loginUrl = new URL('/admin/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  try {
    const secret = getAuthSecret()
    await jwtVerify(token, secret)
    return NextResponse.next()
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('AUTH_SECRET')) {
      return new NextResponse('Internal Server Error: Authentication configuration error', { status: 500 })
    }
    const loginUrl = new URL('/admin/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    const response = NextResponse.redirect(loginUrl)
    response.cookies.delete(SESSION_COOKIE)
    return response
  }
}

export const config = {
  matcher: ['/admin/:path*'],
}
