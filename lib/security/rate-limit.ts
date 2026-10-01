// =============================================================================
// ELITEBUILD — Rate Limiting
// =============================================================================
// Simple in-memory rate limiter. Replace with Redis for multi-instance.
// =============================================================================

const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '30', 10),
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = DEFAULT_CONFIG,
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(identifier, { count: 1, resetTime: now + config.windowMs })
    return { allowed: true, remaining: config.maxRequests - 1, resetIn: config.windowMs }
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetIn: entry.resetTime - now }
  }

  entry.count++
  return { allowed: true, remaining: config.maxRequests - entry.count, resetIn: entry.resetTime - now }
}

// Clean up expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  const cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore) {
      if (now > entry.resetTime) rateLimitStore.delete(key)
    }
  }, 5 * 60 * 1000)
  if (cleanupTimer.unref) {
    cleanupTimer.unref()
  }
}
