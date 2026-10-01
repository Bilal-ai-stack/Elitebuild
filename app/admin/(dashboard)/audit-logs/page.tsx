'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface AuditLog {
  id: string
  action: string
  entity: string
  entityId: string | null
  createdAt: string
  user: { name: string; email: string } | null
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)

  useEffect(() => { load(page) }, [page])

  async function load(p: number) {
    setLoading(true)
    const res = await fetch(`/api/audit-logs?page=${p}&pageSize=30`)
    const data = await res.json()
    if (res.status === 403) setForbidden(true)
    else if (data.success) {
      setLogs(data.data.logs)
      setTotal(data.data.total)
    }
    setLoading(false)
  }

  if (loading && logs.length === 0) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-[#5e6873]" /></div>
  }

  if (forbidden) {
    return (
      <div className="border border-[#e7ebef] bg-white p-8 text-center">
        <h1 className="text-xl font-semibold text-[#17212b]">Audit Logs</h1>
        <p className="mt-2 text-sm text-[#5e6873]">Only SUPER_ADMIN can view audit logs.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#17212b]">Audit Logs</h1>
        <p className="mt-1 text-sm text-[#5e6873]">{total} recorded actions</p>
      </div>

      <div className="overflow-x-auto border border-[#e7ebef] bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-[#e7ebef] bg-[#f7f8fa] text-xs uppercase tracking-wider text-[#5e6873]">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-[#5e6873]">No audit entries yet.</td></tr>
            ) : logs.map((log) => (
              <tr key={log.id} className="border-b border-[#e7ebef]">
                <td className="px-4 py-3 text-xs text-[#5e6873] whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-[#17212b]">{log.user?.name || 'System'}</td>
                <td className="px-4 py-3 text-[#17212b]">{log.action}</td>
                <td className="px-4 py-3 text-[#5e6873]">
                  {log.entity}{log.entityId ? ` · ${log.entityId.slice(0, 8)}…` : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > 30 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 text-[#315d7a] disabled:opacity-40">Previous</button>
          <span className="text-[#5e6873]">Page {page}</span>
          <button disabled={page * 30 >= total} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 text-[#315d7a] disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  )
}
