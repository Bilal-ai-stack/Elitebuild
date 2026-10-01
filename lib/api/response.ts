// =============================================================================
// ELITEBUILD — API Response Helpers
// =============================================================================

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

export interface ApiSuccess<T = unknown> {
  success: true
  data: T
}

export interface ApiError {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError

// ---------------------------------------------------------------------------
// Success responses
// ---------------------------------------------------------------------------

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data } satisfies ApiSuccess<T>, { status })
}

export function apiCreated<T>(data: T) {
  return apiSuccess(data, 201)
}

// ---------------------------------------------------------------------------
// Error responses
// ---------------------------------------------------------------------------

export function apiError(code: string, message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { success: false, error: { code, message, ...(details ? { details } : {}) } } satisfies ApiError,
    { status },
  )
}

export function apiBadRequest(message = 'Invalid request') {
  return apiError('BAD_REQUEST', message, 400)
}

export function apiUnauthorized(message = 'Authentication required') {
  return apiError('UNAUTHORIZED', message, 401)
}

export function apiForbidden(message = 'Insufficient permissions') {
  return apiError('FORBIDDEN', message, 403)
}

export function apiNotFound(message = 'Resource not found') {
  return apiError('NOT_FOUND', message, 404)
}

export function apiConflict(message = 'Resource conflict') {
  return apiError('CONFLICT', message, 409)
}

export function apiTooManyRequests(message = 'Too many requests. Please try again later.') {
  return apiError('RATE_LIMIT', message, 429)
}

export function apiServerError(message = 'An unexpected error occurred') {
  return apiError('INTERNAL_ERROR', message, 500)
}

// ---------------------------------------------------------------------------
// Validation error handler
// ---------------------------------------------------------------------------

export function apiValidationError(error: ZodError) {
  // Zod 4 exposes issues (Zod 3 used .errors)
  const issues = error.issues ?? []
  const details = issues.map((e) => ({
    field: e.path.join('.'),
    message: e.message,
  }))
  return apiError('VALIDATION_ERROR', 'Invalid request data', 400, details)
}

// ---------------------------------------------------------------------------
// Catch-all error handler for API routes
// ---------------------------------------------------------------------------

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return apiValidationError(error)
  }

  if (error instanceof Error) {
    if (error.message === 'UNAUTHORIZED') return apiUnauthorized()
    if (error.message === 'FORBIDDEN') return apiForbidden()
  }

  console.error('[API Error]', error)
  return apiServerError()
}
