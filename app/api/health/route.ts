// GET /api/health
import { NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ success: true, status: 'healthy', timestamp: new Date().toISOString() })
  } catch {
    return NextResponse.json({ success: false, status: 'unhealthy' }, { status: 503 })
  }
}
