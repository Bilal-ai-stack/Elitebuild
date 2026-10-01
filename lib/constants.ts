// =============================================================================
// ELITEBUILD — Design Tokens / Constants
// =============================================================================

export const ELITEBUILD = {
  name: 'ELITE CONSTRUCTION COMPANY',
  shortName: 'ELITEBUILD',
  tagline: 'Engineers · Constructors · Project Managers',
  established: 2006,
} as const

export const PROJECT_STATUSES = [
  'PLANNED', 'ONGOING', 'COMPLETED', 'MAINTENANCE', 'ARCHIVED',
] as const

export const CONTENT_STATUSES = [
  'DRAFT', 'PUBLISHED', 'ARCHIVED',
] as const

export const INQUIRY_STATUSES = [
  'NEW', 'READ', 'IN_PROGRESS', 'RESPONDED', 'CLOSED', 'SPAM',
] as const

export const DOCUMENT_TYPES = [
  'COMPANY_PROFILE', 'CERTIFICATE', 'REGISTRATION', 'CONTRACT',
  'PERFORMANCE_CERTIFICATE', 'TECHNICAL_DOCUMENT', 'SAFETY_DOCUMENT',
  'TENDER_DOCUMENT', 'OTHER',
] as const

export const DOCUMENT_VISIBILITIES = [
  'PUBLIC', 'ADMIN_ONLY', 'PRIVATE',
] as const

export const USER_ROLES = [
  'SUPER_ADMIN', 'ADMIN', 'EDITOR',
] as const

export const EQUIPMENT_CATEGORIES = [
  'Earthwork', 'Road Construction', 'Concrete', 'Lifting',
  'Transportation', 'Surveying', 'Power', 'Other',
] as const

export const PROJECT_CATEGORIES_DEFAULT = [
  'Roads', 'Bridges', 'Buildings', 'Infrastructure', 'Rehabilitation',
  'Maintenance', 'Water Infrastructure', 'Drainage', 'Flood Protection',
  'Institutional', 'Residential', 'Commercial', 'External Works', 'Landscaping',
] as const

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
] as const

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB

export const PAGINATION = {
  defaultPage: 1,
  defaultPageSize: 20,
  maxPageSize: 100,
} as const
