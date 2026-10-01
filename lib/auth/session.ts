// =============================================================================
// ELITEBUILD — Authentication Utilities
// =============================================================================
// JWT-based session authentication for admin routes.
// Uses jose for Edge-compatible JWT operations.
// =============================================================================

import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import prisma from '@/lib/db/prisma'
import type { UserRole } from '@prisma/client'

import { getAuthSecret } from './secret.ts'

export { getAuthSecret }

const SESSION_COOKIE = 'elitebuild-session'

export interface SessionPayload {
  userId: string
  email: string
  name: string
  role: UserRole
  exp: number
}

// ---------------------------------------------------------------------------
// Password hashing (bcryptjs)
// ---------------------------------------------------------------------------

export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcryptjs')
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await import('bcryptjs')
  return bcrypt.compare(password, hash)
}

// ---------------------------------------------------------------------------
// JWT Token
// ---------------------------------------------------------------------------

export async function createSessionToken(payload: Omit<SessionPayload, 'exp'>): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(getAuthSecret())
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret())
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

export async function createSession(userId: string, email: string, name: string, role: UserRole) {
  const token = await createSessionToken({ userId, email, name, role })
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  })
  return token
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifySessionToken(token)
}

export async function destroySession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

// ---------------------------------------------------------------------------
// Auth guards (for server components / actions)
// ---------------------------------------------------------------------------

export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession()
  if (!session) redirect('/admin/login')
  return session
}

export async function requireRole(...roles: UserRole[]): Promise<SessionPayload> {
  const session = await requireAuth()
  if (!roles.includes(session.role)) {
    redirect('/admin?error=forbidden')
  }
  return session
}

// ---------------------------------------------------------------------------
// Auth for API routes
// ---------------------------------------------------------------------------

export async function getApiSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifySessionToken(token)
}

export async function requireApiAuth(): Promise<SessionPayload> {
  const session = await getApiSession()
  if (!session) throw new Error('UNAUTHORIZED')
  return session
}

export async function requireApiRole(...roles: UserRole[]): Promise<SessionPayload> {
  const session = await requireApiAuth()
  if (!roles.includes(session.role)) throw new Error('FORBIDDEN')
  return session
}

// ---------------------------------------------------------------------------
// Permission checks (re-exported from pure permissions module)
// ---------------------------------------------------------------------------

export {
  canManageUsers,
  canManageSettings,
  canManageContent,
  canManageDocuments,
  canViewAuditLogs,
} from './permissions.ts'

