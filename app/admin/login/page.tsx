'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { HardHat, Loader2, Eye, EyeOff } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!data.success) {
        setError(data.error?.message || 'Invalid credentials')
        return
      }

      router.push('/admin')
      router.refresh()
    } catch {
      setError('Unable to connect. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <span className="flex h-12 w-12 items-center justify-center bg-[#c58a2a] text-white">
            <HardHat className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-lg font-bold tracking-[0.12em] text-[#17212b]">ELITEBUILD</h1>
          <p className="mt-1 text-xs text-[#5e6873]">Administration Portal</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="border border-[#d9dee4] bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-[#17212b]">Sign in</h2>
          <p className="mt-1 text-sm text-[#5e6873]">Enter your credentials to access the admin panel.</p>

          {error && (
            <div className="mt-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-[#5e6873]">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="mt-1.5 w-full border border-[#d9dee4] bg-[#f7f8fa] px-4 py-3 text-sm text-[#17212b] outline-none transition focus:border-[#315d7a] focus:ring-1 focus:ring-[#315d7a]"
                placeholder="admin@company.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-[#5e6873]">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="current-password"
                  className="mt-1.5 w-full border border-[#d9dee4] bg-[#f7f8fa] px-4 py-3 pr-10 text-sm text-[#17212b] outline-none transition focus:border-[#315d7a] focus:ring-1 focus:ring-[#315d7a]"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5e6873] hover:text-[#17212b]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-2 bg-[#17212b] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#253341] disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[#8b969f]">
          Protected administration area. Unauthorized access is prohibited.
        </p>
      </div>
    </main>
  )
}
