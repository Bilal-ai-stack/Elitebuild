import type { Metadata } from 'next'
import { getPublicCompany } from '@/lib/services/company'
import { getPublicServices } from '@/lib/services/services'
import { getPublicProjects } from '@/lib/services/projects'
import {
  getPublicCapabilities,
  getPublicEquipment,
  getPublicCredentials,
} from '@/lib/services/content'
import { getPublicTeamMembers } from '@/lib/services/team'
import ElitebuildLanding from '@/components/elitebuild-landing'

import { constructMetadata } from '@/lib/seo/config'
import { generateOrganizationSchema, generateWebSiteSchema } from '@/lib/seo/structured-data'
import { JsonLd } from '@/components/seo/json-ld'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = constructMetadata({
  title: 'ELITE CONSTRUCTION COMPANY | Engineers & Constructors',
  description:
    'Established in 2006. Engineering, civil construction, road networks, bridge structures, building facilities, and project management across Pakistan.',
  pathname: '/',
})

export default async function Home() {
  const [company, services, projects, capabilities, equipment, credentials, team] =
    await Promise.all([
      getPublicCompany(),
      getPublicServices(),
      getPublicProjects(),
      getPublicCapabilities(),
      getPublicEquipment(),
      getPublicCredentials(),
      getPublicTeamMembers(),
    ])

  const orgSchema = generateOrganizationSchema(company)
  const siteSchema = generateWebSiteSchema()

  return (
    <>
      <JsonLd data={[orgSchema, siteSchema]} />
      <ElitebuildLanding
        company={company}
        services={services}
        projects={projects}
        capabilities={capabilities}
        equipment={equipment}
        credentials={credentials}
        team={team}
      />
    </>
  )
}
