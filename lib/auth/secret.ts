// =============================================================================
// ELITEBUILD — Authentication Secret Resolution
// Pure module for retrieving & validating JWT auth secrets
// =============================================================================

export function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: AUTH_SECRET environment variable is missing in production environment.')
    }
    return new TextEncoder().encode('dev-secret-change-in-production')
  }
  return new TextEncoder().encode(secret)
}
