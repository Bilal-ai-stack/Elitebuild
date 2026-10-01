'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Building2, Wrench, FolderKanban, Shield, Truck,
  Award, HelpCircle, FileText, MessageSquare, Users, Settings,
  ClipboardList, LogOut, HardHat, ChevronDown, Menu, X, Zap,
  UserCheck, Briefcase, FileCheck2, Activity
} from 'lucide-react'
import { useState } from 'react'

interface SidebarProps {
  user: { name: string; email: string; role: string }
}

const navGroups = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Content',
    items: [
      { label: 'Company', href: '/admin/company', icon: Building2 },
      { label: 'Team', href: '/admin/team', icon: UserCheck },
      { label: 'Clients', href: '/admin/client-organizations', icon: Briefcase },
      { label: 'Services', href: '/admin/services', icon: Wrench },
      { label: 'Projects', href: '/admin/projects', icon: FolderKanban },
      { label: 'Performance', href: '/admin/performance-certificates', icon: FileCheck2 },
      { label: 'Capabilities', href: '/admin/capabilities', icon: Zap },
      { label: 'Equipment', href: '/admin/equipment', icon: Truck },
      { label: 'Credentials', href: '/admin/credentials', icon: Award },
      { label: 'FAQs', href: '/admin/faqs', icon: HelpCircle },
    ],
  },
  {
    label: 'Media',
    items: [
      { label: 'Documents', href: '/admin/documents', icon: FileText },
    ],
  },
  {
    label: 'Communication',
    items: [
      { label: 'Inquiries', href: '/admin/inquiries', icon: MessageSquare },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Users', href: '/admin/users', icon: Users },
      { label: 'Settings', href: '/admin/settings', icon: Settings },
      { label: 'Audit Logs', href: '/admin/audit-logs', icon: ClipboardList },
      { label: 'RAG Monitoring', href: '/admin/rag-monitoring', icon: Activity, adminOnly: true },
    ],
  },
]

export function AdminSidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/admin/login')
    router.refresh()
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-[#e7ebef] px-5 py-4">
        <span className="flex h-8 w-8 items-center justify-center bg-[#c58a2a] text-white">
          <HardHat className="h-4 w-4" />
        </span>
        <div>
          <p className="text-xs font-bold tracking-[0.12em] text-[#17212b]">ELITEBUILD</p>
          <p className="text-[10px] text-[#5e6873]">Admin Panel</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#9aa3ab]">
              {group.label}
            </p>
            {group.items
              .filter((item) => {
                if ('adminOnly' in item && (item as { adminOnly?: boolean }).adminOnly) {
                  return ['SUPER_ADMIN', 'ADMIN'].includes(user.role)
                }
                return true
              })
              .map((item) => {
                const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`mb-0.5 flex items-center gap-3 rounded px-3 py-2 text-sm transition ${
                      isActive
                        ? 'bg-[#315d7a]/10 font-semibold text-[#315d7a]'
                        : 'text-[#5e6873] hover:bg-[#f1f3f5] hover:text-[#17212b]'
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                )
              })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-[#e7ebef] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[#17212b]">{user.name}</p>
            <p className="truncate text-xs text-[#5e6873]">{user.role.replace('_', ' ')}</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded p-1.5 text-[#5e6873] transition hover:bg-[#f1f3f5] hover:text-red-600"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed left-4 top-4 z-50 rounded bg-white p-2 shadow-md lg:hidden"
        aria-label="Toggle sidebar"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 h-full w-64 border-r border-[#e7ebef] bg-white transition-transform lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
