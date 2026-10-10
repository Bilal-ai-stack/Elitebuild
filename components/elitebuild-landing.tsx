'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { Float, OrbitControls } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import Link from 'next/link'
import {
  ArrowRight,
  Building2,
  Check,
  ChevronRight,
  ClipboardList,
  Droplets,
  HardHat,
  Network,
  Ruler,
  ShieldCheck,
  Waves,
  X,
  Phone,
  Mail,
  MapPin,
  Award,
  Wrench,
  ExternalLink,
  Users,
} from 'lucide-react'
import { PublicHeader } from '@/components/public-header'
import { PublicFooter } from '@/components/public-footer'
import { ContactForm } from '@/components/contact-form'
import { KnowledgeSearchSection } from '@/components/rag/knowledge-search-section'
import { createWhatsAppLink, isWhatsAppConfigured } from '@/lib/services/whatsapp'

const defaultServices = [
  { slug: 'civil-construction', title: 'Civil Construction', copy: 'Roads, bridges, structures, buildings, and associated civil works.', category: 'Civil Works' },
  { slug: 'infrastructure-development', title: 'Infrastructure Development', copy: 'Road networks, drainage, bridge infrastructure, water-related works, and external infrastructure.', category: 'Infrastructure' },
  { slug: 'building-construction', title: 'Building Construction', copy: 'Residential, institutional, administrative, accommodation, and support facilities.', category: 'Buildings' },
  { slug: 'rehabilitation-maintenance', title: 'Rehabilitation & Maintenance', copy: 'Repair, renovation, rehabilitation, re-carpeting, and maintenance.', category: 'Maintenance' },
  { slug: 'project-management', title: 'Project Management', copy: 'Construction planning, coordination, execution, supervision, and administration.', category: 'Management' },
  { slug: 'site-development', title: 'Site Development', copy: 'Roads, utilities, drainage, landscaping, and external works.', category: 'Site Works' },
]

const defaultProjects = [
  { id: '1', slug: 'road-repair-dalazak', category: 'Roads', title: 'Road Repair & Rehabilitation', detail: 'Shabistan Cinema / Hayat Hotel toward Dalazak Road via Sabzi Mandi, Peshawar.', location: 'Peshawar' },
  { id: '2', slug: 'garanga-sher-killi-road', category: 'Roads', title: 'Garanga–Sher Killi Road', detail: 'Improvement and widening works across the documented road corridor.', location: 'Khyber Pakhtunkhwa' },
  { id: '3', slug: 'pir-bala-to-pir-kala-road', category: 'Infrastructure', title: 'Pir Bala to Pir Kala Road', detail: 'Rehabilitation under the KP Emergency Rural Road Rehabilitation Project.', location: 'Peshawar' },
  { id: '4', slug: 'institutional-building-works', category: 'Buildings', title: 'Institutional Building Works', detail: 'School reconstruction, halls, hostels, offices, and associated facilities.', location: 'Peshawar / Regional' },
  { id: '5', slug: 'bridge-approach-works', category: 'Bridges', title: 'Bridge & Approach Works', detail: 'RCC bridge construction, bridge approaches, and associated infrastructure.', location: 'Khyber Pakhtunkhwa' },
  { id: '6', slug: 'utility-external-works', category: 'Utilities', title: 'Utility & External Works', detail: 'Water supply, sewerage, drainage, landscaping, and site development.', location: 'Regional' },
]

const defaultCapabilities = [
  'Roads & bridges',
  'Buildings & facilities',
  'Drainage & water works',
  'Rehabilitation & maintenance',
  'Utilities & external works',
  'Landscaping & site development',
  'Project management',
  'Technical execution',
]

function ConstructionScene() {
  const group = useRef<THREE.Group>(null)
  const floors = [0.08, 0.58, 1.08]
  const windows = [-0.72, -0.24, 0.24, 0.72]

  useFrame((state) => {
    if (group.current) {
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (!prefersReducedMotion) {
        group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.18) * 0.08
        group.current.position.y = Math.sin(state.clock.elapsedTime * 0.7) * 0.035
      }
    }
  })

  return (
    <group ref={group}>
      <Float speed={1.1} rotationIntensity={0.06} floatIntensity={0.12}>
        <mesh position={[0, -0.38, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3.8, 2.8, 18, 14]} />
          <meshBasicMaterial color="#315d7a" wireframe transparent opacity={0.2} />
        </mesh>
        <mesh position={[0, -0.22, 0]}>
          <boxGeometry args={[2.5, 0.14, 1.65]} />
          <meshStandardMaterial color="#c58a2a" roughness={0.7} />
        </mesh>
        <mesh position={[0, 1.43, 0]}>
          <boxGeometry args={[2.25, 0.12, 1.48]} />
          <meshStandardMaterial color="#315d7a" roughness={0.45} />
        </mesh>
        {floors.map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <boxGeometry args={[2.35, 0.08, 1.55]} />
            <meshStandardMaterial color="#d6e0e5" roughness={0.65} />
          </mesh>
        ))}
        {[-0.95, 0.95].map((x) =>
          [-0.58, 0.58].map((z) => (
            <mesh key={`${x}-${z}`} position={[x, 0.62, z]}>
              <boxGeometry args={[0.12, 1.62, 0.12]} />
              <meshStandardMaterial color="#315d7a" metalness={0.12} />
            </mesh>
          ))
        )}
        {floors.flatMap((y) =>
          windows.map((x) => (
            <mesh key={`${y}-${x}`} position={[x, y + 0.24, -0.785]}>
              <boxGeometry args={[0.25, 0.22, 0.025]} />
              <meshStandardMaterial color="#75a7bc" emissive="#315d7a" emissiveIntensity={0.18} />
            </mesh>
          ))
        )}
        <mesh position={[0, 2.05, 0]}>
          <boxGeometry args={[0.08, 1.05, 0.08]} />
          <meshStandardMaterial color="#c58a2a" />
        </mesh>
        <mesh position={[0, 2.56, 0]}>
          <coneGeometry args={[0.22, 0.34, 4]} />
          <meshStandardMaterial color="#c58a2a" />
        </mesh>
        <mesh position={[0.72, 2.2, 0]} rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.07, 1.55, 0.07]} />
          <meshStandardMaterial color="#c58a2a" />
        </mesh>
      </Float>
    </group>
  )
}

function HeroModel({ estYear }: { estYear: number }) {
  const [hasWebGL, setHasWebGL] = useState(true)

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas')
      const supported = !!(
        window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      )
      setHasWebGL(supported)
    } catch {
      setHasWebGL(false)
    }
  }, [])

  return (
    <div className="relative min-h-[400px] overflow-hidden border border-[#d9dee4] bg-[#f4f7f8] shadow-[0_24px_70px_rgba(23,33,43,.12)]">
      <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(#dce4e9_1px,transparent_1px),linear-gradient(90deg,#dce4e9_1px,transparent_1px)] [background-size:34px_34px]" />
      <div className="absolute left-6 top-6 z-10 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#315d7a]">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[#3d7a5a]" /> Engineering model / site study
      </div>

      <div className="absolute inset-0">
        {hasWebGL ? (
          <Canvas camera={{ position: [3.2, 2.2, 4.5], fov: 38 }} dpr={[1, 1.5]}>
            <ambientLight intensity={1.7} />
            <directionalLight position={[3, 5, 4]} intensity={2.2} color="#fff7e9" />
            <ConstructionScene />
            <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.45} />
          </Canvas>
        ) : (
          <div className="flex h-full w-full items-center justify-center p-8 text-center">
            <div className="max-w-xs space-y-2">
              <HardHat className="mx-auto h-12 w-12 text-[#315d7a]" />
              <p className="text-sm font-semibold text-[#17212b]">Architectural Blueprint Visualization</p>
              <p className="text-xs text-[#5e6873]">Hardware 3D acceleration inactive; schematic view active.</p>
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-6 left-6 right-6 z-10 flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold text-[#17212b]">Planning through delivery</p>
          <p className="mt-1 text-[11px] text-[#5e6873]">Architecture · infrastructure · execution</p>
        </div>
        <span className="border border-[#c9d5db] bg-white px-3 py-1 text-[10px] font-semibold text-[#315d7a]">
          ELITE / {estYear}
        </span>
      </div>
    </div>
  )
}

import type { getPublicCompany } from '@/lib/services/company'
import type { getPublicServices } from '@/lib/services/services'
import type { getPublicProjects } from '@/lib/services/projects'
import type {
  getPublicCapabilities,
  getPublicEquipment,
  getPublicCredentials,
} from '@/lib/services/content'
import type { getPublicTeamMembers } from '@/lib/services/team'

export interface ElitebuildLandingProps {
  company: Awaited<ReturnType<typeof getPublicCompany>>
  services?: Awaited<ReturnType<typeof getPublicServices>>
  projects?: Awaited<ReturnType<typeof getPublicProjects>>
  capabilities?: Awaited<ReturnType<typeof getPublicCapabilities>>
  equipment?: Awaited<ReturnType<typeof getPublicEquipment>>
  credentials?: Awaited<ReturnType<typeof getPublicCredentials>>
  team?: Awaited<ReturnType<typeof getPublicTeamMembers>>
}

export function ElitebuildLanding({
  company,
  services = [],
  projects = [],
  capabilities = [],
  equipment = [],
  credentials = [],
  team = [],
}: ElitebuildLandingProps) {
  const [activeCategory, setActiveCategory] = useState('All')
  const estYear = company.establishedYear || 2006

  const hasWhatsApp = isWhatsAppConfigured(company.whatsapp)
  const whatsappUrl = hasWhatsApp
    ? createWhatsAppLink(company.whatsapp!, 'Hello, I would like to inquire about ELITEBUILD engineering and construction services.')
    : ''

  // Process services for display
  const displayServices = useMemo(() => {
    if (services.length > 0) {
      return services.slice(0, 6).map((s) => ({
        slug: s.slug,
        title: s.name,
        copy: s.shortDescription || 'Professional engineering and execution services.',
        category: s.category?.name || 'General Engineering',
      }))
    }
    return defaultServices
  }, [services])

  // Process projects for display
  const displayProjects = useMemo(() => {
    if (projects.length > 0) {
      return projects.slice(0, 6).map((p) => ({
        id: p.id,
        slug: p.slug,
        category: p.category?.name || 'Infrastructure',
        title: p.title,
        detail: p.shortDescription || 'Documented civil and infrastructure execution.',
        location: p.location || 'Regional',
      }))
    }
    return defaultProjects
  }, [projects])

  // Categories list
  const categories = useMemo(() => {
    const cats = Array.from(new Set(displayProjects.map((p) => p.category)))
    return ['All', ...cats]
  }, [displayProjects])

  const filteredProjects = useMemo(() => {
    if (activeCategory === 'All') return displayProjects
    return displayProjects.filter((p) => p.category === activeCategory)
  }, [activeCategory, displayProjects])

  // Process capabilities for display
  const displayCapabilities = useMemo(() => {
    if (capabilities.length > 0) {
      return capabilities.slice(0, 8).map((c) => ({
        title: c.title,
        description: c.description,
      }))
    }
    return defaultCapabilities.map((title) => ({ title, description: null }))
  }, [capabilities])

  return (
    <div id="top" className="overflow-hidden bg-[#f7f8fa] text-[#17212b]">
      {/* Navigation Header */}
      <PublicHeader company={company} />

      {/* Hero Section */}
      <section className="relative border-b border-[#dfe5e8] bg-[#fbfcfc]">
        <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(#e7ecee_1px,transparent_1px),linear-gradient(90deg,#e7ecee_1px,transparent_1px)] [background-size:64px_64px]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 pb-20 pt-20 lg:grid-cols-[.9fr_1.1fr] lg:px-10 lg:pb-28 lg:pt-28">
          <div>
            <p className="mb-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#315d7a]">
              <span className="h-px w-8 bg-[#c58a2a]" /> Engineers · Constructors · Project Managers
            </p>
            <h1 className="max-w-xl text-5xl font-semibold leading-[1.04] tracking-[-0.05em] sm:text-6xl lg:text-[70px]">
              Building infrastructure.<br />
              <span className="text-[#315d7a]">Delivering excellence.</span>
            </h1>
            <p className="mt-7 max-w-lg text-base leading-7 text-[#5e6873]">
              {company.description ||
                `An established engineering and construction organization established in ${estYear} with documented experience across infrastructure, buildings, rehabilitation, maintenance, and associated works.`}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                href="/projects"
                className="inline-flex items-center gap-3 bg-[#c58a2a] px-5 py-3.5 text-xs font-bold text-white shadow-[0_8px_18px_rgba(197,138,42,.2)] transition hover:bg-[#b07b24]"
              >
                Explore Our Projects <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/services"
                className="inline-flex items-center gap-2 px-3 py-3.5 text-xs font-semibold text-[#315d7a] hover:underline"
              >
                Our Services <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-11 flex items-center gap-3 text-[10px] text-[#68737d]">
              <ShieldCheck className="h-4 w-4 text-[#3d7a5a]" />
              <span>
                Established in {estYear} · {company.city || 'Peshawar'}, {company.country || 'Pakistan'}
              </span>
            </div>
          </div>

          <HeroModel estYear={estYear} />
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="border-b border-[#dfe5e8] bg-white py-20 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-14 px-6 lg:grid-cols-[.8fr_1.2fr] lg:px-10">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c58a2a]">
              Built on experience
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              Engineering capability with a practical point of view.
            </h2>
            <div className="mt-8">
              <Link
                href="/about"
                className="inline-flex items-center gap-2 text-xs font-bold text-[#315d7a] hover:underline"
              >
                Read Complete Organization Profile <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
          <div>
            <p className="max-w-2xl text-base leading-8 text-[#5e6873]">
              {company.aboutText ||
                `ELITE CONSTRUCTION COMPANY was established in ${estYear} in Peshawar. The company profile documents work across roads, bridges, buildings, residential and institutional facilities, drainage, water infrastructure, rehabilitation, maintenance, landscaping, and external works.`}
            </p>
            <div className="mt-9 grid gap-5 border-t border-[#e2e7ea] pt-7 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#315d7a]">
                  Documented offices
                </p>
                <p className="mt-2 text-sm leading-6 text-[#5e6873]">
                  {company.addressPrimary ? (
                    <>
                      {company.addressPrimary}
                      {company.city ? `, ${company.city}` : ''}
                    </>
                  ) : (
                    'Islamabad · Hamza Tower, F-11 Markaz'
                  )}
                  <br />
                  {company.addressSecondary || 'Peshawar · Jawad Tower, University Road'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#315d7a]">
                  Core role
                </p>
                <p className="mt-2 text-sm leading-6 text-[#5e6873]">
                  Project managers, government contractors, engineers, builders, architects, designers, and technical constructors.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section id="capabilities" className="bg-[#eef2f4] py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#315d7a]">
                What we deliver
              </p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                Engineering & construction capability
              </h2>
            </div>
            <Link
              href="/capabilities"
              className="inline-flex items-center gap-2 text-xs font-bold text-[#315d7a] hover:underline"
            >
              View All Technical Capabilities <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {displayCapabilities.map((item, index) => (
              <div
                key={item.title}
                className="border border-[#d8e0e4] bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg"
              >
                <span className="text-xs font-bold text-[#c58a2a]">0{index + 1}</span>
                <h3 className="mt-6 text-lg font-semibold text-[#17212b]">{item.title}</h3>
                {item.description && (
                  <p className="mt-2 text-xs leading-5 text-[#5e6873] line-clamp-2">{item.description}</p>
                )}
                <div className="mt-6 h-px w-10 bg-[#315d7a]" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c58a2a]">
                Our services
              </p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                From planning to project delivery.
              </h2>
            </div>
            <div className="flex flex-col items-start gap-3 sm:items-end">
              <p className="max-w-sm text-sm leading-6 text-[#5e6873]">
                A multidisciplinary approach for public-sector, institutional, commercial, and residential environments.
              </p>
              <Link
                href="/services"
                className="inline-flex items-center gap-2 text-xs font-bold text-[#315d7a] hover:underline"
              >
                Explore Full Services Directory <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {displayServices.map((svc, index) => (
              <article
                key={svc.title}
                className="group flex flex-col justify-between border border-[#dfe5e8] p-7 transition hover:border-[#c58a2a] hover:shadow-[0_16px_34px_rgba(23,33,43,.08)]"
              >
                <div>
                  <div className="flex h-11 w-11 items-center justify-center bg-[#edf3f5] text-[#315d7a]">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="mt-8 flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#9aa3ab]">
                      0{index + 1}
                    </p>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#c58a2a]">
                      {svc.category}
                    </span>
                  </div>
                  <h3 className="mt-2 text-xl font-semibold text-[#17212b]">{svc.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#5e6873]">{svc.copy}</p>
                </div>

                <div className="mt-6 border-t border-[#edf1f3] pt-4">
                  <Link
                    href={`/services/${svc.slug}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#315d7a] transition group-hover:text-[#c58a2a]"
                  >
                    View Details <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section id="projects" className="bg-[#f1f3f5] py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="flex flex-col justify-between gap-7 md:flex-row md:items-end">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#315d7a]">
                Documented experience
              </p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                Selected project experience
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`border px-3 py-2 text-[11px] font-semibold transition ${
                    activeCategory === category
                      ? 'border-[#315d7a] bg-[#315d7a] text-white'
                      : 'border-[#d3dce1] bg-white text-[#5e6873] hover:border-[#315d7a]'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project, index) => (
              <article
                key={project.title}
                className="flex min-h-[255px] flex-col justify-between border border-[#d9e0e4] bg-white p-6 shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#c58a2a]">
                      {project.category}
                    </span>
                    <span className="text-[10px] text-[#8b969f]">0{index + 1}</span>
                  </div>
                  <h3 className="mt-6 text-xl font-semibold leading-tight text-[#17212b]">
                    {project.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[#5e6873]">{project.detail}</p>
                </div>

                <div className="mt-6 border-t border-[#edf1f3] pt-4 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#3d7a5a]">
                    <Check className="h-3.5 w-3.5 shrink-0" /> {project.location}
                  </div>
                  <Link
                    href={`/projects/${project.slug || project.id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#315d7a] hover:underline"
                  >
                    Details <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <p className="text-xs text-[#7d8790]">
              Project records reflect published technical execution data from verified corporate documentation.
            </p>
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 text-xs font-bold text-[#315d7a] hover:underline shrink-0"
            >
              Browse Complete Projects Directory <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Institutional Experience & Highlights Section */}
      <section className="bg-[#17212b] py-20 text-white lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-[1fr_1fr] lg:items-center lg:px-10">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d4a04d]">
              Institutional experience
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              Built for complex environments.
            </h2>
            <p className="mt-5 max-w-lg text-sm leading-7 text-[#b9c3c9]">
              Documented project experience associated with Communication & Works, Military Engineering Services, Peshawar Development Authority, IESCO, TESCO, universities, public-sector departments, and institutional organizations.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/credentials"
                className="inline-flex items-center gap-2 border border-[#d4a04d] bg-transparent px-4 py-2 text-xs font-bold text-[#d4a04d] transition hover:bg-[#d4a04d] hover:text-[#17212b]"
              >
                <Award className="h-3.5 w-3.5" /> View Verified Credentials
              </Link>
              <Link
                href="/equipment"
                className="inline-flex items-center gap-2 border border-[#42515b] bg-[#202d36] px-4 py-2 text-xs font-semibold text-[#e8edef] transition hover:border-[#687d8c]"
              >
                <Wrench className="h-3.5 w-3.5" /> Equipment Fleet
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px border border-[#42515b] bg-[#42515b]">
            {[
              'Communication & Works',
              'Military Engineering Services',
              'Peshawar Development Authority',
              'IESCO / TESCO',
              'Universities & Institutions',
              'Public-Sector Departments',
            ].map((item) => (
              <div key={item} className="bg-[#202d36] p-5 text-sm text-[#e8edef]">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Engineering & Technical Team Section (if published members exist) */}
      {team.length > 0 && (
        <section className="border-b border-[#dfe5e8] bg-white py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c58a2a]">
                  Technical Leadership
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl text-[#17212b]">
                  Engineering & Management Team
                </h2>
                <p className="mt-2 text-sm text-[#5e6873]">
                  Qualified project managers, site engineers, and technical personnel overseeing on-site execution.
                </p>
              </div>
              <Link
                href="/team"
                className="inline-flex items-center gap-2 text-xs font-bold text-[#315d7a] hover:underline shrink-0"
              >
                View Full Team Directory <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {team.slice(0, 3).map((member) => (
                <div
                  key={member.id}
                  className="flex flex-col justify-between border border-[#dfe5e8] bg-[#fbfcfc] p-6 shadow-sm transition hover:border-[#315d7a]"
                >
                  <div className="flex items-start gap-4">
                    {member.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={member.photoUrl}
                        alt={member.name}
                        className="h-14 w-14 rounded-full object-cover border border-[#d9dee4]"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#17212b] text-base font-bold text-[#c58a2a]">
                        {member.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="text-base font-semibold text-[#17212b]">{member.name}</h3>
                      <p className="text-xs font-medium text-[#c58a2a]">{member.title}</p>
                      {member.department && (
                        <p className="mt-0.5 text-[11px] text-[#8b969f]">{member.department}</p>
                      )}
                    </div>
                  </div>

                  {member.bio && (
                    <p className="mt-4 text-xs leading-6 text-[#5e6873] line-clamp-3">
                      {member.bio}
                    </p>
                  )}

                  <div className="mt-5 border-t border-[#edf1f3] pt-3 flex items-center justify-between text-[11px] text-[#7d8790]">
                    <span>Professional Staff</span>
                    <Link href="/team" className="font-semibold text-[#315d7a] hover:underline">
                      Profile →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Interactive Contact & Inquiry Section */}
      <KnowledgeSearchSection />

      <section id="contact" className="bg-[#f7f8fa] py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
            {/* Left Column: Direct Inquiries Context */}
            <div className="lg:col-span-5 space-y-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c58a2a]">
                  Start a conversation
                </p>
                <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                  Planning the next project?
                </h2>
                <p className="mt-4 text-base leading-7 text-[#5e6873]">
                  Discuss your infrastructure, building, rehabilitation, or maintenance requirements directly with our technical leadership.
                </p>
              </div>

              {/* Direct Channels */}
              <div className="space-y-4 border-t border-[#dfe5e8] pt-6 text-sm text-[#5e6873]">
                {company.phonePrimary && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-[#315d7a] shrink-0" />
                    <a href={`tel:${company.phonePrimary}`} className="font-semibold text-[#17212b] hover:text-[#315d7a]">
                      {company.phonePrimary}
                    </a>
                  </div>
                )}
                {company.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-[#315d7a] shrink-0" />
                    <a href={`mailto:${company.email}`} className="font-semibold text-[#17212b] hover:text-[#315d7a]">
                      {company.email}
                    </a>
                  </div>
                )}
                {company.addressPrimary && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-[#315d7a] shrink-0 mt-0.5" />
                    <span>
                      {company.addressPrimary}
                      {company.city ? `, ${company.city}` : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Direct WhatsApp CTA if configured */}
              {hasWhatsApp && (
                <div className="rounded border border-[#3d7a5a]/30 bg-[#3d7a5a]/5 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#3d7a5a]">
                    Instant WhatsApp Consultation
                  </p>
                  <p className="mt-1 text-xs text-[#5e6873]">
                    Reach our technical desk directly for rapid specifications exchange.
                  </p>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-2 rounded bg-[#3d7a5a] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#32664b]"
                  >
                    Open WhatsApp Chat <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              <p className="text-xs text-[#8b969f]">
                Client / Project Portal — Coming as a future digital capability.
              </p>
            </div>

            {/* Right Column: Live Interactive Contact Form */}
            <div className="lg:col-span-7">
              <div className="rounded border border-[#dfe5e8] bg-white p-8 shadow-sm sm:p-10">
                <div className="border-b border-[#edf1f3] pb-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#315d7a]">
                    Consultation Request
                  </p>
                  <h3 className="mt-1 text-xl font-semibold text-[#17212b]">
                    Submit Your Project Inquiries
                  </h3>
                </div>
                <div className="mt-6">
                  <ContactForm />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Public Footer */}
      <PublicFooter company={company} />
    </div>
  )
}

export default ElitebuildLanding
export function MobileNavClose() {
  return <X className="h-5 w-5" />
}
export function TeamIcon() {
  return <Waves className="h-5 w-5" />
}
