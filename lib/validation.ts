// =============================================================================
// ELITEBUILD — Zod Validation Schemas
// =============================================================================

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const slug = z.string().min(1).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Must be a valid URL slug (lowercase, hyphens)')
const optionalUrl = z.string().url().max(2000).optional().or(z.literal(''))
const optionalUrlOrPath = z.string().max(2000).refine(
  (val) => !val || val === '' || val.startsWith('/') || /^https?:\/\//i.test(val),
  { message: 'Must be a valid URL or relative path' }
).optional().nullable().or(z.literal(''))
const optionalEmail = z.string().email().max(255).optional().or(z.literal(''))
const optionalPhone = z.string().max(30).regex(/^[+\d\s()-]*$/, 'Invalid phone format').optional().or(z.literal(''))
const safeText = z.string().max(50000)
const shortText = z.string().max(500)

// ---------------------------------------------------------------------------
// Company
// ---------------------------------------------------------------------------

export const companySchema = z.object({
  legalName: z.string().max(300).optional(),
  displayName: z.string().max(300).optional(),
  tagline: shortText.optional(),
  description: safeText.optional(),
  establishedYear: z.number().int().min(1900).max(2100).optional().nullable(),
  logoUrl: optionalUrl,
  coverImageUrl: optionalUrl,
  aboutText: safeText.optional(),
  mission: safeText.optional(),
  vision: safeText.optional(),
  addressPrimary: z.string().max(500).optional(),
  addressSecondary: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  province: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  website: optionalUrl,
  email: optionalEmail,
  whatsapp: optionalPhone,
  phonePrimary: optionalPhone,
  phoneSecondary: optionalPhone,
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  facebook: optionalUrl,
  linkedin: optionalUrl,
  instagram: optionalUrl,
  googleMapsUrl: optionalUrl,
})

export type CompanyInput = z.infer<typeof companySchema>

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const serviceSchema = z.object({
  name: z.string().min(1).max(200),
  slug,
  shortDescription: shortText.optional(),
  description: safeText.optional(),
  icon: z.string().max(100).optional(),
  coverImageUrl: optionalUrl,
  featured: z.boolean().default(false),
  displayOrder: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
  categoryId: z.string().optional().nullable(),
})

export type ServiceInput = z.infer<typeof serviceSchema>

// ---------------------------------------------------------------------------
// Project
// ---------------------------------------------------------------------------

export const projectSchema = z.object({
  title: z.string().min(1).max(300),
  slug,
  shortDescription: shortText.optional(),
  description: safeText.optional(),
  location: z.string().max(300).optional(),
  clientOrganization: z.string().max(300).optional(),
  startDate: z.coerce.date().optional().nullable(),
  completionDate: z.coerce.date().optional().nullable(),
  status: z.enum(['PLANNED', 'ONGOING', 'COMPLETED', 'MAINTENANCE', 'ARCHIVED']).default('PLANNED'),
  contentStatus: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  scope: safeText.optional(),
  contractType: z.string().max(100).optional(),
  featured: z.boolean().default(false),
  displayOrder: z.number().int().min(0).default(0),
  coverImageUrl: optionalUrl,
  categoryId: z.string().optional().nullable(),
})

export type ProjectInput = z.infer<typeof projectSchema>

// ---------------------------------------------------------------------------
// Project Image
// ---------------------------------------------------------------------------

export const projectImageSchema = z.object({
  projectId: z.string().min(1),
  imageUrl: z.string().min(1).max(2000),
  thumbnailUrl: z.string().max(2000).optional().or(z.literal('')),
  altText: z.string().max(300).optional(),
  caption: z.string().max(500).optional(),
  displayOrder: z.number().int().min(0).default(0),
  featured: z.boolean().default(false),
})

export type ProjectImageInput = z.infer<typeof projectImageSchema>

// ---------------------------------------------------------------------------
// Capability
// ---------------------------------------------------------------------------

export const capabilitySchema = z.object({
  title: z.string().min(1).max(200),
  description: safeText.optional(),
  icon: z.string().max(100).optional(),
  imageUrl: optionalUrl,
  displayOrder: z.number().int().min(0).default(0),
  featured: z.boolean().default(false),
  active: z.boolean().default(true),
})

export type CapabilityInput = z.infer<typeof capabilitySchema>

// ---------------------------------------------------------------------------
// Equipment
// ---------------------------------------------------------------------------

export const equipmentSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().max(100).optional(),
  description: safeText.optional(),
  quantity: z.number().int().min(0).optional().nullable(),
  imageUrl: optionalUrl,
  status: z.string().max(50).default('AVAILABLE'),
  displayOrder: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
})

export type EquipmentInput = z.infer<typeof equipmentSchema>

// ---------------------------------------------------------------------------
// Credential
// ---------------------------------------------------------------------------

export const credentialSchema = z.object({
  title: z.string().min(1).max(300),
  issuingOrganization: z.string().max(300).optional(),
  credentialNumber: z.string().max(200).optional(),
  issueDate: z.coerce.date().optional().nullable(),
  expiryDate: z.coerce.date().optional().nullable(),
  description: safeText.optional(),
  documentUrl: optionalUrl,
  imageUrl: optionalUrl,
  displayOrder: z.number().int().min(0).default(0),
  verified: z.boolean().default(false),
  active: z.boolean().default(true),
})

export type CredentialInput = z.infer<typeof credentialSchema>

// ---------------------------------------------------------------------------
// Contact Inquiry (public submission)
// ---------------------------------------------------------------------------

export const inquirySchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  organization: z.string().max(300).optional(),
  email: z.string().email('Valid email is required').max(255),
  phone: optionalPhone,
  whatsapp: optionalPhone,
  subject: z.string().max(300).optional(),
  message: z.string().min(10, 'Message must be at least 10 characters').max(5000),
  projectType: z.string().max(100).optional(),
  preferredContactMethod: z.string().max(50).optional(),
})

export type InquiryInput = z.infer<typeof inquirySchema>

export const inquiryUpdateSchema = z.object({
  status: z.enum(['NEW', 'READ', 'IN_PROGRESS', 'RESPONDED', 'CLOSED', 'SPAM']),
  notes: safeText.optional(),
})

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

export const faqSchema = z.object({
  question: z.string().min(1).max(500),
  answer: z.string().min(1).max(10000),
  category: z.string().max(100).optional(),
  displayOrder: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
  public: z.boolean().default(true),
})

export type FAQInput = z.infer<typeof faqSchema>

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

export const documentSchema = z.object({
  title: z.string().min(1).max(300),
  description: safeText.optional(),
  documentType: z.enum([
    'COMPANY_PROFILE', 'CERTIFICATE', 'REGISTRATION', 'CONTRACT',
    'PERFORMANCE_CERTIFICATE', 'TECHNICAL_DOCUMENT', 'SAFETY_DOCUMENT',
    'TENDER_DOCUMENT', 'OTHER',
  ]).default('OTHER'),
  fileUrl: z.string().min(1).max(2000),
  mimeType: z.string().max(100).optional(),
  fileSize: z.number().int().min(0).optional(),
  visibility: z.enum(['PUBLIC', 'ADMIN_ONLY', 'PRIVATE']).default('ADMIN_ONLY'),
})

export type DocumentInput = z.infer<typeof documentSchema>

// ---------------------------------------------------------------------------
// Site Setting
// ---------------------------------------------------------------------------

export const siteSettingSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string().max(10000).optional().nullable(),
  group: z.string().max(50).default('general'),
})

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(200),
  password: z.string().min(8).max(128),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'EDITOR']).default('EDITOR'),
})

// ---------------------------------------------------------------------------
// Pagination / Filtering
// ---------------------------------------------------------------------------

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export type PaginationInput = z.infer<typeof paginationSchema>

// ---------------------------------------------------------------------------
// Team Member
// ---------------------------------------------------------------------------

export const teamMemberSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  title: z.string().max(200).optional().nullable(),
  department: z.string().max(200).optional().nullable(),
  bio: safeText.optional().nullable(),
  photoUrl: optionalUrlOrPath,
  email: optionalEmail.nullable(),
  phone: optionalPhone.nullable(),
  displayOrder: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
})

export type TeamMemberInput = z.infer<typeof teamMemberSchema>

// ---------------------------------------------------------------------------
// Client Organization
// ---------------------------------------------------------------------------

export const clientOrganizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(300),
  shortName: z.string().max(100).optional().nullable(),
  description: safeText.optional().nullable(),
  logoUrl: optionalUrlOrPath,
  website: optionalUrl.nullable(),
  displayOrder: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
})

export type ClientOrganizationInput = z.infer<typeof clientOrganizationSchema>

// ---------------------------------------------------------------------------
// Performance Certificate
// ---------------------------------------------------------------------------

export const performanceCertificateSchema = z.object({
  title: z.string().min(1, 'Certificate title is required').max(300),
  projectId: z.string().optional().nullable(),
  issuedById: z.string().optional().nullable(),
  issueDate: z.coerce.date().optional().nullable(),
  description: safeText.optional().nullable(),
  documentUrl: optionalUrlOrPath,
  imageUrl: optionalUrlOrPath,
  verified: z.boolean().default(false),
  active: z.boolean().default(true),
})

export type PerformanceCertificateInput = z.infer<typeof performanceCertificateSchema>
