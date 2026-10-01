import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { AdminSidebar } from '@/components/admin/sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/admin/login')

  return (
    <div className="flex min-h-screen bg-[#f7f8fa]">
      <AdminSidebar user={{ name: session.name, email: session.email, role: session.role }} />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  )
}
