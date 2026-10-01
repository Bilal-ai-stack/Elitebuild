// =============================================================================
// ELITEBUILD — WhatsApp Utility
// =============================================================================

/** Generate a WhatsApp chat link */
export function createWhatsAppLink(number: string, message?: string): string {
  // Strip everything except digits and +
  const clean = number.replace(/[^\d+]/g, '')
  const base = `https://wa.me/${clean}`
  if (message) {
    return `${base}?text=${encodeURIComponent(message)}`
  }
  return base
}

/** Check if a WhatsApp number is configured */
export function isWhatsAppConfigured(number: string | null | undefined): boolean {
  return !!number && number.trim().length > 5
}
