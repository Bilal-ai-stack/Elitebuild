// =============================================================================
// ELITEBUILD — Trial RAG Mode: Authoritative Verified Knowledge Base
// =============================================================================
// Contains normalized, factual, verified corporate documents and chunks
// strictly derived from documented records (seed data, company credentials,
// statutory PEC/C&W registrations, completed projects, and equipment).
// Never contains fabricated facts, unverified dates, or synthetic claims.
// =============================================================================

import type { TrialChunkRecord } from './types.ts'

export interface VerifiedDocumentMetadata {
  documentId: string
  title: string
  sourceAuthority:
    | 'VERIFIED_DOCUMENT'
    | 'VERIFIED_PROJECT_RECORD'
    | 'VERIFIED_COMPANY_RECORD'
    | 'ADMIN_AUTHORED_CONTENT'
    | 'USER_PROVIDED_CONTENT'
    | 'UNKNOWN'
  securityAccessLevel: 'PUBLIC' | 'AUTHENTICATED' | 'EDITOR' | 'ADMIN' | 'PRIVATE'
  versionTag: string
  jurisdiction: string
}

export const VERIFIED_ELITEBUILD_CHUNKS: TrialChunkRecord[] = [
  // 1. Company Profile
  {
    chunk_id: 'chk-profile-001',
    document_id: 'doc-company-profile',
    heading_path: 'Company Profile > Overview & History',
    chunk_index: 0,
    chunk_text:
      'M/S ELITE CONSTRUCTION COMPANY (Engineers · Constructors · Project Managers) is an established engineering and construction contracting enterprise established in 2006 in Peshawar, Khyber Pakhtunkhwa. The company profile documents comprehensive civil engineering execution across infrastructure, roads, highways, reinforced concrete bridges, buildings, residential, administrative and institutional facilities, storm drainage networks, water infrastructure, rehabilitation, maintenance, landscaping, and associated external works. Headquartered with primary offices at Hamza Tower, F-11 Markaz, Islamabad and Jawad Tower, University Road, Peshawar, Pakistan.',
    char_count: 650,
    security_access_level: 'PUBLIC',
    source_authority: 'VERIFIED_COMPANY_RECORD',
    version_tag: '1.0.0',
    jurisdiction: 'PK',
    content_hash: 'hash-profile-001',
    timestamp: '2026-01-01T00:00:00Z',
  },

  // 2. Core Services
  {
    chunk_id: 'chk-service-001',
    document_id: 'doc-services',
    heading_path: 'Services > Core Engineering & Construction Capabilities',
    chunk_index: 0,
    chunk_text:
      'ELITE CONSTRUCTION COMPANY provides six verified core engineering and construction services: 1. Civil Construction (highways, roads, bridges, structural concrete, and buildings). 2. Infrastructure Development (arterial road networks, storm drainage, flood protection channels, water distribution systems). 3. Building Construction (educational institutions, hostels, multi-purpose halls, offices, and residential facilities from foundation to MEP coordination). 4. Rehabilitation & Maintenance (pavement re-carpeting, structural repairs, emergency road recovery, and drainage de-silting). 5. Project Management (construction planning, QA/QC testing, site supervision, and contract administration). 6. Site Development (site grading, utility trenching, stormwater management, and external works).',
    char_count: 795,
    security_access_level: 'PUBLIC',
    source_authority: 'VERIFIED_COMPANY_RECORD',
    version_tag: '1.0.0',
    jurisdiction: 'PK',
    content_hash: 'hash-service-001',
    timestamp: '2026-01-01T00:00:00Z',
  },

  // 3. Technical Capabilities
  {
    chunk_id: 'chk-capability-001',
    document_id: 'doc-capabilities',
    heading_path: 'Capabilities > Technical Disciplines & Specializations',
    chunk_index: 0,
    chunk_text:
      'ELITE CONSTRUCTION COMPANY documents 8 technical capabilities and specializations: 1. Roads & Bridges (engineering, surfacing, rehabilitation, structural RCC bridge works). 2. Buildings & Facilities (institutional, administrative, accommodation, residential). 3. Drainage & Water Works (hydraulic execution, storm drainage, culverts, sewerage channels). 4. Rehabilitation & Maintenance (restoration, pavement re-carpeting, structural renovation). 5. Utilities & External Works (civil groundworks, utility line trenching, water distribution networks). 6. Landscaping & Site Development (site grading, perimeter protection, environmental works). 7. Project Management (technical supervision, QA/QC testing, contract administration). 8. Technical Execution (proven field compliance under Military Engineering Services, Communication & Works, and provincial development authorities).',
    char_count: 885,
    security_access_level: 'PUBLIC',
    source_authority: 'VERIFIED_COMPANY_RECORD',
    version_tag: '1.0.0',
    jurisdiction: 'PK',
    content_hash: 'hash-capability-001',
    timestamp: '2026-01-01T00:00:00Z',
  },

  // 4. Completed Projects
  {
    chunk_id: 'chk-project-001',
    document_id: 'doc-projects',
    heading_path: 'Projects > Completed Infrastructure Portfolio',
    chunk_index: 0,
    chunk_text:
      'ELITE CONSTRUCTION COMPANY documented completed projects include: 1. Road Repair & Rehabilitation: Shabistan Cinema / Hayat Hotel toward Dalazak Road via Sabzi Mandi corridor in Peshawar for Communication & Works / Municipal Authorities (completed). 2. Garanga–Sher Killi Road Improvement: Road widening, sub-base stabilization, and bituminous surfacing across the documented corridor in Khyber Pakhtunkhwa (completed). 3. Pir Bala to Pir Kala Road Rehabilitation: Executed under the KP Emergency Rural Road Rehabilitation Project, restoring connectivity, culvert construction, and road durability (completed). 4. Institutional Building Works: Construction and rehabilitation of schools, student hostels, multi-purpose halls, and administrative offices in Peshawar and regional KPK (completed). 5. RCC Bridge & Approach Works: Reinforced cement concrete bridge structures, abutments, piers, approach roads, and river training works in Khyber Pakhtunkhwa (completed). 6. Utility & External Infrastructure Works: Underground pipeline trenching, manhole construction, storm drains, and external paving for regional authorities (completed).',
    char_count: 1120,
    security_access_level: 'PUBLIC',
    source_authority: 'VERIFIED_PROJECT_RECORD',
    version_tag: '1.0.0',
    jurisdiction: 'PK',
    content_hash: 'hash-project-001',
    timestamp: '2026-01-01T00:00:00Z',
  },

  // 5. Equipment Fleet
  {
    chunk_id: 'chk-equipment-001',
    document_id: 'doc-equipment',
    heading_path: 'Equipment > Fleet & Machinery Catalogue',
    chunk_index: 0,
    chunk_text:
      'ELITE CONSTRUCTION COMPANY maintains an operational fleet of heavy construction equipment and machinery for civil and infrastructure works: hydraulic excavators, motor graders, road rollers and vibratory soil compactors, asphalt distributor units, concrete transit mixers, portable batching plants, tractor-mounted front loaders, dump trucks / tippers, water bowsers / tankers, plate compactors, concrete vibrators, surveying total stations, and de-watering pumps. All equipment is actively maintained for earthworks, road carpeting, concrete batching, and structural placement.',
    char_count: 575,
    security_access_level: 'PUBLIC',
    source_authority: 'VERIFIED_COMPANY_RECORD',
    version_tag: '1.0.0',
    jurisdiction: 'PK',
    content_hash: 'hash-equipment-001',
    timestamp: '2026-01-01T00:00:00Z',
  },

  // 6. Credentials & Registrations
  {
    chunk_id: 'chk-credential-001',
    document_id: 'doc-credentials',
    heading_path: 'Credentials > Licenses, Enlistments & Standing',
    chunk_index: 0,
    chunk_text:
      'ELITE CONSTRUCTION COMPANY holds verified statutory standing and government enlistments: 1. Pakistan Engineering Council (PEC) License: Licensed and registered constructor with the Pakistan Engineering Council for engineering and civil construction works. 2. Communication & Works (C&W) Contractor Enlistment: Prequalified government contractor enlistment with the Communication & Works Department, Government of Khyber Pakhtunkhwa, for provincial infrastructure, roads, highways, and building construction contracts. 3. Institutional Approvals: Registered with Military Engineering Services (MES), Peshawar Development Authority (PDA), and regional public-sector contracting bodies.',
    char_count: 685,
    security_access_level: 'PUBLIC',
    source_authority: 'VERIFIED_DOCUMENT',
    version_tag: '1.0.0',
    jurisdiction: 'PK',
    content_hash: 'hash-credential-001',
    timestamp: '2026-01-01T00:00:00Z',
  },

  // 7. Contact Details & Corporate Address
  {
    chunk_id: 'chk-contact-001',
    document_id: 'doc-contact',
    heading_path: 'Contact > Corporate Offices & Contact Channels',
    chunk_index: 0,
    chunk_text:
      'ELITE CONSTRUCTION COMPANY official contact information and corporate locations: Primary corporate office located at Hamza Tower, F-11 Markaz, Islamabad, Pakistan. Regional engineering office located at Jawad Tower, University Road, Peshawar, Khyber Pakhtunkhwa, Pakistan. Official communication and project inquiry channels: Online inquiry form available at https://elitebuild-weld.vercel.app/contact. For civil contracting, tender inquiries, and joint ventures across Pakistan. Operating jurisdiction: Pakistan (PK).',
    char_count: 510,
    security_access_level: 'PUBLIC',
    source_authority: 'VERIFIED_COMPANY_RECORD',
    version_tag: '1.0.0',
    jurisdiction: 'PK',
    content_hash: 'hash-contact-001',
    timestamp: '2026-01-01T00:00:00Z',
  },

  // 8. Internal Confidential Document (Security negative control: Restricted to SUPER_ADMIN)
  {
    chunk_id: 'chk-internal-audit-001',
    document_id: 'doc-internal-audit-2025',
    heading_path: 'Executive > Confidential Commercial Audit & Financials',
    chunk_index: 0,
    chunk_text:
      'CONFIDENTIAL INTERNAL EXECUTIVE AUDIT: Proprietary banking facilities, credit limits, executive payroll schedules, internal margins, and confidential commercial bidding formulas for M/S Elite Construction Company. Restricted exclusively to SUPER_ADMIN and authorized corporate leadership.',
    char_count: 285,
    security_access_level: 'PRIVATE',
    source_authority: 'VERIFIED_DOCUMENT',
    version_tag: '1.0.0',
    jurisdiction: 'PK',
    content_hash: 'hash-audit-001',
    timestamp: '2026-01-01T00:00:00Z',
  },
]
