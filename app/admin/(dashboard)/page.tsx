import { getDashboardStats } from '@/lib/services/content'
import { getInquiryStats } from '@/lib/services/inquiries'
import { requireAuth } from '@/lib/auth/session'
import {
  FolderKanban, Wrench, MessageSquare, Image, FileText, Truck, Award, HelpCircle,
  UserCheck, Briefcase, FileCheck2
} from 'lucide-react'

export default async function AdminDashboardPage() {
  const session = await requireAuth()
  const stats = await getDashboardStats()
  const inquiryStats = await getInquiryStats()

  const cards = [
    { label: 'Projects', value: stats.projects, icon: FolderKanban, color: '#315d7a' },
    { label: 'Services', value: stats.services, icon: Wrench, color: '#315d7a' },
    { label: 'New Inquiries', value: inquiryStats.new, icon: MessageSquare, color: '#c58a2a' },
    { label: 'Team Members', value: stats.team, icon: UserCheck, color: '#315d7a' },
    { label: 'Client Orgs', value: stats.clientOrgs, icon: Briefcase, color: '#315d7a' },
    { label: 'Performance Certs', value: stats.certificates, icon: FileCheck2, color: '#315d7a' },
    { label: 'Credentials', value: stats.credentials, icon: Award, color: '#315d7a' },
    { label: 'Documents', value: stats.documents, icon: FileText, color: '#315d7a' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#17212b]">Dashboard</h1>
        <p className="mt-1 text-sm text-[#5e6873]">Welcome back, {session.name}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="border border-[#e7ebef] bg-white p-5 transition hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#5e6873]">{card.label}</p>
              <card.icon className="h-5 w-5" style={{ color: card.color }} />
            </div>
            <p className="mt-3 text-3xl font-semibold text-[#17212b]">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#9aa3ab]">Quick Actions</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <a href="/admin/projects" className="border border-[#d9dee4] bg-white px-4 py-2.5 text-sm font-medium text-[#315d7a] transition hover:border-[#315d7a]">
            Manage Projects
          </a>
          <a href="/admin/team" className="border border-[#d9dee4] bg-white px-4 py-2.5 text-sm font-medium text-[#315d7a] transition hover:border-[#315d7a]">
            Manage Team
          </a>
          <a href="/admin/client-organizations" className="border border-[#d9dee4] bg-white px-4 py-2.5 text-sm font-medium text-[#315d7a] transition hover:border-[#315d7a]">
            Client Organizations
          </a>
          <a href="/admin/performance-certificates" className="border border-[#d9dee4] bg-white px-4 py-2.5 text-sm font-medium text-[#315d7a] transition hover:border-[#315d7a]">
            Certificates
          </a>
          <a href="/admin/services" className="border border-[#d9dee4] bg-white px-4 py-2.5 text-sm font-medium text-[#315d7a] transition hover:border-[#315d7a]">
            Manage Services
          </a>
          <a href="/admin/inquiries" className="border border-[#d9dee4] bg-white px-4 py-2.5 text-sm font-medium text-[#315d7a] transition hover:border-[#315d7a]">
            View Inquiries
          </a>
          <a href="/admin/company" className="border border-[#d9dee4] bg-white px-4 py-2.5 text-sm font-medium text-[#315d7a] transition hover:border-[#315d7a]">
            Company Info
          </a>
        </div>
      </div>

      {/* Recent Inquiries Preview */}
      {inquiryStats.total > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#9aa3ab]">Inquiry Summary</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="border border-[#e7ebef] bg-white p-4">
              <p className="text-2xl font-semibold text-[#c58a2a]">{inquiryStats.new}</p>
              <p className="mt-1 text-xs text-[#5e6873]">Awaiting Response</p>
            </div>
            <div className="border border-[#e7ebef] bg-white p-4">
              <p className="text-2xl font-semibold text-[#315d7a]">{inquiryStats.inProgress}</p>
              <p className="mt-1 text-xs text-[#5e6873]">In Progress</p>
            </div>
            <div className="border border-[#e7ebef] bg-white p-4">
              <p className="text-2xl font-semibold text-[#3d7a5a]">{inquiryStats.responded}</p>
              <p className="mt-1 text-xs text-[#5e6873]">Responded</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
