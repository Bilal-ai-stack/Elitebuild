// =============================================================================
// ELITEBUILD — Future AI / RAG Tool Interfaces
// =============================================================================
// Controlled service-layer tools for a future AI agent.
// These never grant raw SQL or private data access.
// Do NOT install LangChain/LangGraph until explicitly required.
// =============================================================================

import { getPublicCompany } from '@/lib/services/company'
import { getPublicServices } from '@/lib/services/services'
import { getPublicProjects, getPublicProjectBySlug } from '@/lib/services/projects'
import { getPublicFAQs, getPublicDocuments, getPublicCapabilities, getPublicCredentials } from '@/lib/services/content'
import { isWhatsAppConfigured, createWhatsAppLink } from '@/lib/services/whatsapp'

export type AiToolName =
  | 'searchProjects'
  | 'getProject'
  | 'searchServices'
  | 'getCompany'
  | 'searchFAQs'
  | 'getPublicDocuments'
  | 'getContactInformation'
  | 'searchCapabilities'
  | 'searchCredentials'

/** Search published projects (optional category / text filter). */
export async function searchProjects(query?: { categorySlug?: string; featured?: boolean; limit?: number }) {
  return getPublicProjects(query)
}

/** Get a single published project by slug. */
export async function getProject(slug: string) {
  return getPublicProjectBySlug(slug)
}

/** List active public services. */
export async function searchServices() {
  return getPublicServices()
}

/** Public company profile (no internal fields). */
export async function getCompany() {
  return getPublicCompany()
}

/** Public FAQs. */
export async function searchFAQs() {
  return getPublicFAQs()
}

/** Documents with PUBLIC visibility only. */
export async function getPublicDocumentsTool() {
  return getPublicDocuments()
}

/** Public capabilities. */
export async function searchCapabilities() {
  return getPublicCapabilities()
}

/** Verified + active credentials only. */
export async function searchCredentials() {
  return getPublicCredentials()
}

/**
 * Contact channels that are actually configured.
 * Unconfigured channels are omitted — never invent numbers/emails.
 */
export async function getContactInformation() {
  const company = await getPublicCompany()
  const contact: Record<string, string> = {}

  if (company.email) contact.email = company.email
  if (company.phonePrimary) contact.phonePrimary = company.phonePrimary
  if (company.phoneSecondary) contact.phoneSecondary = company.phoneSecondary
  if (isWhatsAppConfigured(company.whatsapp) && company.whatsapp) {
    contact.whatsapp = company.whatsapp
    contact.whatsappLink = createWhatsAppLink(company.whatsapp)
  }
  if (company.addressPrimary) contact.addressPrimary = company.addressPrimary
  if (company.addressSecondary) contact.addressSecondary = company.addressSecondary
  if (company.city) contact.city = company.city
  if (company.province) contact.province = company.province
  if (company.country) contact.country = company.country
  if (company.website) contact.website = company.website
  if (company.googleMapsUrl) contact.googleMapsUrl = company.googleMapsUrl

  return contact
}

/** Registry of allowed AI tools (for future agent wiring). */
export const AI_PUBLIC_TOOLS: Record<AiToolName, (...args: never[]) => Promise<unknown>> = {
  searchProjects: searchProjects as (...args: never[]) => Promise<unknown>,
  getProject: getProject as (...args: never[]) => Promise<unknown>,
  searchServices: searchServices as (...args: never[]) => Promise<unknown>,
  getCompany: getCompany as (...args: never[]) => Promise<unknown>,
  searchFAQs: searchFAQs as (...args: never[]) => Promise<unknown>,
  getPublicDocuments: getPublicDocumentsTool as (...args: never[]) => Promise<unknown>,
  getContactInformation: getContactInformation as (...args: never[]) => Promise<unknown>,
  searchCapabilities: searchCapabilities as (...args: never[]) => Promise<unknown>,
  searchCredentials: searchCredentials as (...args: never[]) => Promise<unknown>,
}
