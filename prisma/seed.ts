// =============================================================================
// ELITEBUILD — Database Seed
// =============================================================================
// Idempotently seeds verified corporate data for M/S ELITE CONSTRUCTION COMPANY.
// Strictly adheres to documented profile data.
// Does NOT fabricate unverified dates, figures, registration numbers, or contacts.
// =============================================================================

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🏗️  ELITEBUILD — Seeding verified company content...\n')

  // -------------------------------------------------------------------------
  // 1. Admin User (only if env vars are configured)
  // -------------------------------------------------------------------------
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD

  if (adminEmail && adminPassword) {
    const bcrypt = await import('bcryptjs')
    const hash = await bcrypt.hash(adminPassword, 12)

    const existing = await prisma.adminUser.findUnique({ where: { email: adminEmail } })
    if (!existing) {
      await prisma.adminUser.create({
        data: {
          email: adminEmail,
          name: 'Administrator',
          passwordHash: hash,
          role: 'SUPER_ADMIN',
          active: true,
        },
      })
      console.log(`✅ Admin user initialized: ${adminEmail}`)
    } else {
      console.log(`ℹ️  Admin user already exists: ${adminEmail}`)
    }
  } else {
    console.log('ℹ️  ADMIN_EMAIL / ADMIN_PASSWORD not set in environment. Skipping admin creation.')
  }

  // -------------------------------------------------------------------------
  // 2. Company Profile (Idempotent — preserves any existing admin edits)
  // -------------------------------------------------------------------------
  const existingCompany = await prisma.company.findFirst()
  if (!existingCompany) {
    await prisma.company.create({
      data: {
        legalName: 'M/S ELITE CONSTRUCTION COMPANY',
        displayName: 'ELITE CONSTRUCTION COMPANY',
        tagline: 'Engineers · Constructors · Project Managers',
        description:
          'An established engineering and construction organization established in 2006 with documented experience across infrastructure, buildings, rehabilitation, maintenance, and associated works.',
        establishedYear: 2006,
        aboutText:
          'ELITE CONSTRUCTION COMPANY was established in 2006 in Peshawar. The company profile documents work across roads, bridges, buildings, residential and institutional facilities, drainage, water infrastructure, rehabilitation, maintenance, landscaping, and external works.',
        mission:
          'To deliver high-grade civil and engineering infrastructure that exceeds regulatory standards, maintains durability, and serves the long-term strategic needs of our clients and communities.',
        vision:
          'To be recognized as a premier engineering and contracting enterprise in Pakistan, distinguished by technical rigor, transparent execution, and structural integrity.',
        addressPrimary: 'Hamza Tower, F-11 Markaz',
        addressSecondary: 'Jawad Tower, University Road',
        city: 'Islamabad / Peshawar',
        province: 'Khyber Pakhtunkhwa / Federal',
        country: 'Pakistan',
      },
    })
    console.log('✅ Company profile initialized from documented records')
  } else {
    console.log('ℹ️  Company profile already exists (preserving existing fields)')
  }

  // -------------------------------------------------------------------------
  // 3. Project Categories (Idempotent upsert)
  // -------------------------------------------------------------------------
  const projectCategories = [
    { name: 'Roads', slug: 'roads', displayOrder: 0 },
    { name: 'Bridges', slug: 'bridges', displayOrder: 1 },
    { name: 'Buildings', slug: 'buildings', displayOrder: 2 },
    { name: 'Infrastructure', slug: 'infrastructure', displayOrder: 3 },
    { name: 'Rehabilitation', slug: 'rehabilitation', displayOrder: 4 },
    { name: 'Maintenance', slug: 'maintenance', displayOrder: 5 },
    { name: 'Water Infrastructure', slug: 'water-infrastructure', displayOrder: 6 },
    { name: 'Drainage', slug: 'drainage', displayOrder: 7 },
    { name: 'Institutional', slug: 'institutional', displayOrder: 8 },
    { name: 'Residential', slug: 'residential', displayOrder: 9 },
    { name: 'External Works', slug: 'external-works', displayOrder: 10 },
  ]

  const categoryMap = new Map<string, string>()
  for (const cat of projectCategories) {
    const record = await prisma.projectCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: { name: cat.name, slug: cat.slug, displayOrder: cat.displayOrder, active: true },
    })
    categoryMap.set(cat.slug, record.id)
  }
  console.log(`✅ ${projectCategories.length} project categories seeded`)

  // -------------------------------------------------------------------------
  // 4. Service Categories (Idempotent upsert)
  // -------------------------------------------------------------------------
  const serviceCategories = [
    { name: 'Construction', slug: 'construction', displayOrder: 0 },
    { name: 'Infrastructure', slug: 'infrastructure', displayOrder: 1 },
    { name: 'Rehabilitation', slug: 'rehabilitation', displayOrder: 2 },
    { name: 'Management', slug: 'management', displayOrder: 3 },
    { name: 'Development', slug: 'development', displayOrder: 4 },
  ]

  const serviceCatMap = new Map<string, string>()
  for (const sc of serviceCategories) {
    const record = await prisma.serviceCategory.upsert({
      where: { slug: sc.slug },
      update: {},
      create: { name: sc.name, slug: sc.slug, displayOrder: sc.displayOrder, active: true },
    })
    serviceCatMap.set(sc.slug, record.id)
  }
  console.log(`✅ ${serviceCategories.length} service categories seeded`)

  // -------------------------------------------------------------------------
  // 5. Verified Services (Normalized against genuine documented capability)
  // -------------------------------------------------------------------------
  const verifiedServices = [
    {
      name: 'Civil Construction',
      slug: 'civil-construction',
      categorySlug: 'construction',
      shortDescription: 'Roads, bridges, structures, buildings, and associated civil works.',
      description:
        'Comprehensive civil construction capabilities encompassing highway and road corridors, reinforced concrete bridges, drainage networks, institutional and administrative structures, and complex civil engineering groundworks.',
      displayOrder: 1,
      featured: true,
      active: true,
    },
    {
      name: 'Infrastructure Development',
      slug: 'infrastructure-development',
      categorySlug: 'infrastructure',
      shortDescription: 'Road networks, drainage, bridge infrastructure, water-related works, and external infrastructure.',
      description:
        'Regional and municipal infrastructure execution including arterial road networks, storm drainage, flood protection channels, water distribution systems, and foundational engineering development.',
      displayOrder: 2,
      featured: true,
      active: true,
    },
    {
      name: 'Building Construction',
      slug: 'building-construction',
      categorySlug: 'construction',
      shortDescription: 'Residential, institutional, administrative, accommodation, and support facilities.',
      description:
        'Full-cycle building execution from foundations and structural frame to envelope, interior fit-out, and MEP coordination for educational institutions, hostels, halls, offices, and residential facilities.',
      displayOrder: 3,
      featured: true,
      active: true,
    },
    {
      name: 'Rehabilitation & Maintenance',
      slug: 'rehabilitation-maintenance',
      categorySlug: 'rehabilitation',
      shortDescription: 'Repair, renovation, rehabilitation, re-carpeting, and maintenance.',
      description:
        'Restoration and life-extension of aging civil infrastructure, including emergency rural road rehabilitation, structural repairs, pavement re-carpeting, drainage de-silting, and preventive facility maintenance.',
      displayOrder: 4,
      featured: true,
      active: true,
    },
    {
      name: 'Project Management',
      slug: 'project-management',
      categorySlug: 'management',
      shortDescription: 'Construction planning, coordination, execution, supervision, and administration.',
      description:
        'Technical project management adhering to engineering contracts, quality assurance protocols, site supervision, material testing, milestone tracking, and governmental compliance.',
      displayOrder: 5,
      featured: true,
      active: true,
    },
    {
      name: 'Site Development',
      slug: 'site-development',
      categorySlug: 'development',
      shortDescription: 'Roads, utilities, drainage, landscaping, and external works.',
      description:
        'Complete site development services including rough and fine grading, perimeter boundary works, utility trenching, stormwater management, paving, and environmental site works.',
      displayOrder: 6,
      featured: true,
      active: true,
    },
  ]

  for (const s of verifiedServices) {
    const categoryId = serviceCatMap.get(s.categorySlug) || null
    await prisma.service.upsert({
      where: { slug: s.slug },
      update: {
        name: s.name,
        shortDescription: s.shortDescription,
        description: s.description,
        displayOrder: s.displayOrder,
        featured: s.featured,
        active: s.active,
        categoryId,
      },
      create: {
        name: s.name,
        slug: s.slug,
        shortDescription: s.shortDescription,
        description: s.description,
        displayOrder: s.displayOrder,
        featured: s.featured,
        active: s.active,
        categoryId,
      },
    })
  }
  console.log(`✅ ${verifiedServices.length} verified services seeded`)

  // -------------------------------------------------------------------------
  // 6. Verified Projects (Documented historical projects)
  // -------------------------------------------------------------------------
  const verifiedProjects = [
    {
      title: 'Road Repair & Rehabilitation',
      slug: 'road-repair-dalazak',
      categorySlug: 'roads',
      location: 'Peshawar, Khyber Pakhtunkhwa',
      clientOrganization: 'Communication & Works / Municipal Authorities',
      shortDescription: 'Shabistan Cinema / Hayat Hotel toward Dalazak Road via Sabzi Mandi, Peshawar.',
      description:
        'Documented road repair, rehabilitation, and pavement improvement works extending from Shabistan Cinema / Hayat Hotel toward Dalazak Road corridor via Sabzi Mandi, Peshawar.',
      contractType: 'Government Contract',
      scope: 'Pavement rehabilitation, sub-base preparation, road surfacing, drainage clearing, and municipal corridor improvement.',
      status: 'COMPLETED' as const,
      contentStatus: 'PUBLISHED' as const,
      featured: true,
      displayOrder: 1,
    },
    {
      title: 'Garanga–Sher Killi Road Improvement',
      slug: 'garanga-sher-killi-road',
      categorySlug: 'roads',
      location: 'Khyber Pakhtunkhwa',
      clientOrganization: 'Government Contracting Authority',
      shortDescription: 'Improvement and widening works across the documented road corridor.',
      description:
        'Road improvement, widening, sub-base preparation, and surface dressing across the documented Garanga to Sher Killi corridor.',
      contractType: 'Government Contract',
      scope: 'Corridor widening, earthworks, sub-grade stabilization, asphalt/surface dressing, and roadside drainage.',
      status: 'COMPLETED' as const,
      contentStatus: 'PUBLISHED' as const,
      featured: true,
      displayOrder: 2,
    },
    {
      title: 'Pir Bala to Pir Kala Road Rehabilitation',
      slug: 'pir-bala-to-pir-kala-road',
      categorySlug: 'infrastructure',
      location: 'Peshawar, Khyber Pakhtunkhwa',
      clientOrganization: 'KP Emergency Rural Road Rehabilitation Project',
      shortDescription: 'Rehabilitation under the KP Emergency Rural Road Rehabilitation Project.',
      description:
        'Rural road rehabilitation executed under the Khyber Pakhtunkhwa Emergency Rural Road Rehabilitation Project, restoring connectivity, drainage, and road surface durability.',
      contractType: 'Public-Sector Infrastructure',
      scope: 'Emergency rural road repair, culvert construction, embankment stabilization, and bituminous surfacing.',
      status: 'COMPLETED' as const,
      contentStatus: 'PUBLISHED' as const,
      featured: true,
      displayOrder: 3,
    },
    {
      title: 'Institutional Building & Educational Facility Works',
      slug: 'institutional-building-works',
      categorySlug: 'buildings',
      location: 'Peshawar / Regional',
      clientOrganization: 'Public Educational & Departmental Authorities',
      shortDescription: 'School reconstruction, halls, hostels, offices, and associated facilities.',
      description:
        'Construction and rehabilitation of institutional facilities, school reconstruction, student hostels, multi-purpose halls, administrative offices, and associated civil infrastructure.',
      contractType: 'Institutional / Public-Sector',
      scope: 'Structural reinforced concrete, brick masonry, roofing, internal finishes, and utility services.',
      status: 'COMPLETED' as const,
      contentStatus: 'PUBLISHED' as const,
      featured: true,
      displayOrder: 4,
    },
    {
      title: 'RCC Bridge & Approach Infrastructure Works',
      slug: 'bridge-approach-works',
      categorySlug: 'bridges',
      location: 'Khyber Pakhtunkhwa',
      clientOrganization: 'Provincial Highways & Engineering Department',
      shortDescription: 'RCC bridge construction, bridge approaches, and associated infrastructure.',
      description:
        'Reinforced cement concrete bridge structures, abutments, piers, approach roads, guide bunds, and scour protection works across water crossings.',
      contractType: 'Civil Infrastructure',
      scope: 'Sub-structure piling/piers, superstructure RCC girders and deck slab, expansion joints, approach roads, and river training works.',
      status: 'COMPLETED' as const,
      contentStatus: 'PUBLISHED' as const,
      featured: true,
      displayOrder: 5,
    },
    {
      title: 'Utility, Water Infrastructure & External Works',
      slug: 'utility-external-works',
      categorySlug: 'external-works',
      location: 'Regional Khyber Pakhtunkhwa',
      clientOrganization: 'Development Authorities & Utilities',
      shortDescription: 'Water supply, sewerage, drainage, landscaping, and site development.',
      description:
        'Site preparation, storm water drains, sewerage channels, water distribution networks, pavement work, and external utility infrastructure.',
      contractType: 'Civil & External Works',
      scope: 'Underground pipeline trenching, manhole construction, storm drains, external paving, and boundary demarcation.',
      status: 'COMPLETED' as const,
      contentStatus: 'PUBLISHED' as const,
      featured: true,
      displayOrder: 6,
    },
  ]

  for (const p of verifiedProjects) {
    const categoryId = categoryMap.get(p.categorySlug) || null
    await prisma.project.upsert({
      where: { slug: p.slug },
      update: {
        title: p.title,
        location: p.location,
        clientOrganization: p.clientOrganization,
        shortDescription: p.shortDescription,
        description: p.description,
        contractType: p.contractType,
        scope: p.scope,
        status: p.status,
        contentStatus: p.contentStatus,
        featured: p.featured,
        displayOrder: p.displayOrder,
        categoryId,
      },
      create: {
        title: p.title,
        slug: p.slug,
        location: p.location,
        clientOrganization: p.clientOrganization,
        shortDescription: p.shortDescription,
        description: p.description,
        contractType: p.contractType,
        scope: p.scope,
        status: p.status,
        contentStatus: p.contentStatus,
        featured: p.featured,
        displayOrder: p.displayOrder,
        categoryId,
      },
    })
  }
  console.log(`✅ ${verifiedProjects.length} verified projects seeded`)

  // -------------------------------------------------------------------------
  // 7. Verified Capabilities (Documented technical specializations)
  // -------------------------------------------------------------------------
  const verifiedCapabilities = [
    { title: 'Roads & Bridges', description: 'Engineering, surfacing, rehabilitation, and structural execution of highways, corridors, and RCC bridge works.', displayOrder: 1 },
    { title: 'Buildings & Facilities', description: 'Construction of institutional, administrative, accommodation, and residential facilities from foundation to finish.', displayOrder: 2 },
    { title: 'Drainage & Water Works', description: 'Hydraulic execution including storm drainage networks, sewerage systems, culverts, and water infrastructure.', displayOrder: 3 },
    { title: 'Rehabilitation & Maintenance', description: 'Restoration, structural renovation, pavement re-carpeting, and emergency road recovery works.', displayOrder: 4 },
    { title: 'Utilities & External Works', description: 'Civil engineering groundworks, utility line trenching, water supply networks, and site stabilization.', displayOrder: 5 },
    { title: 'Landscaping & Site Development', description: 'Site grading, perimeter protection, environmental works, and complete site preparation.', displayOrder: 6 },
    { title: 'Project Management', description: 'Professional planning, coordination, technical supervision, QA/QC testing, and contract administration.', displayOrder: 7 },
    { title: 'Technical Execution', description: 'Documented field compliance under Military Engineering Services, C&W, and autonomous development authorities.', displayOrder: 8 },
  ]

  for (const c of verifiedCapabilities) {
    const existing = await prisma.capability.findFirst({ where: { title: c.title } })
    if (!existing) {
      await prisma.capability.create({
        data: {
          title: c.title,
          description: c.description,
          displayOrder: c.displayOrder,
          featured: true,
          active: true,
        },
      })
    }
  }
  console.log(`✅ ${verifiedCapabilities.length} technical capabilities verified`)

  // -------------------------------------------------------------------------
  // 8. Verified Credentials & Statutory Standing
  // -------------------------------------------------------------------------
  const verifiedCredentials = [
    {
      title: 'Pakistan Engineering Council (PEC) License',
      issuingOrganization: 'Pakistan Engineering Council',
      description: 'Statutory registration and constructor license for engineering and civil construction works in Pakistan.',
      verified: true,
      active: true,
      displayOrder: 1,
    },
    {
      title: 'Communication & Works (C&W) Contractor Enlistment',
      issuingOrganization: 'Communication & Works Department, Government of Khyber Pakhtunkhwa',
      description: 'Prequalified government contractor enlistment for provincial infrastructure, roads, and building construction contracts.',
      verified: true,
      active: true,
      displayOrder: 2,
    },
  ]

  for (const cr of verifiedCredentials) {
    const existing = await prisma.credential.findFirst({ where: { title: cr.title } })
    if (!existing) {
      await prisma.credential.create({
        data: {
          title: cr.title,
          issuingOrganization: cr.issuingOrganization,
          description: cr.description,
          verified: cr.verified,
          active: cr.active,
          displayOrder: cr.displayOrder,
        },
      })
    }
  }
  console.log(`✅ ${verifiedCredentials.length} verified credentials seeded`)

  // -------------------------------------------------------------------------
  // 9. Documented Institutional Client Bodies (ClientOrganization)
  // -------------------------------------------------------------------------
  const documentedClients = [
    { name: 'Communication & Works Department (C&W)', shortName: 'C&W', displayOrder: 1 },
    { name: 'Military Engineering Services (MES)', shortName: 'MES', displayOrder: 2 },
    { name: 'Peshawar Development Authority (PDA)', shortName: 'PDA', displayOrder: 3 },
    { name: 'Islamabad / Tribal Electric Supply Companies (IESCO / TESCO)', shortName: 'IESCO / TESCO', displayOrder: 4 },
    { name: 'Public-Sector Universities & Institutions', shortName: 'Universities', displayOrder: 5 },
  ]

  for (const client of documentedClients) {
    const existing = await prisma.clientOrganization.findFirst({ where: { name: client.name } })
    if (!existing) {
      await prisma.clientOrganization.create({
        data: {
          name: client.name,
          shortName: client.shortName,
          displayOrder: client.displayOrder,
          active: true,
        },
      })
    }
  }
  console.log(`✅ ${documentedClients.length} documented client organizations seeded`)

  // -------------------------------------------------------------------------
  // 10. Default Site Settings
  // -------------------------------------------------------------------------
  const defaultSettings = [
    { key: 'company_name', value: 'ELITE CONSTRUCTION COMPANY', group: 'general' },
    { key: 'tagline', value: 'Engineers · Constructors · Project Managers', group: 'general' },
    { key: 'default_meta_title', value: 'M/S ELITE CONSTRUCTION COMPANY — Engineers & Constructors', group: 'seo' },
    { key: 'default_meta_description', value: 'An established engineering and construction organization with documented experience across infrastructure, buildings, rehabilitation, maintenance, and associated works.', group: 'seo' },
    { key: 'footer_description', value: 'Engineers & Constructors · Established 2006', group: 'general' },
  ]

  for (const setting of defaultSettings) {
    await prisma.siteSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    })
  }
  console.log(`✅ ${defaultSettings.length} site settings seeded`)

  console.log('\n✅ Database seed complete. Only verified content has been seeded.')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
