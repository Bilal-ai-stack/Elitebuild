// =============================================================================
// ELITEBUILD — Server-Side AI Provider & Database Diagnostics Route
// =============================================================================
// Direct, isolated diagnostics for:
// 1. Runtime environment presence & character lengths (NEVER exposes secrets)
// 2. Direct Cloudflare Workers AI test (@cf/baai/bge-small-en-v1.5)
// 3. Direct Groq API test (llama-3.3-70b-versatile)
// 4. Safe read-only pgvector extension and rag_chunks schema inspection
// =============================================================================

import { NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const result: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    deploymentInfo: {
      vercelEnv: process.env.VERCEL_ENV || 'unknown',
      gitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA ? process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7) : 'local',
      gitCommitMessage: process.env.VERCEL_GIT_COMMIT_MESSAGE || null,
      ragMode: process.env.RAG_MODE || 'unconfigured',
    },
    environmentPresence: {},
    cloudflareDiagnostics: {},
    groqDiagnostics: {},
    pgvectorDiagnostics: {},
  }

  // ---------------------------------------------------------------------------
  // 1. Verify Runtime Environment Presence (NEVER print secret values)
  // ---------------------------------------------------------------------------
  const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID || ''
  const cfAiToken = process.env.CLOUDFLARE_AI_API_TOKEN || ''
  const cfTokenFallback = process.env.CLOUDFLARE_API_TOKEN || ''
  const groqKey = process.env.GROQ_API_KEY || ''
  const dbUrl = process.env.DATABASE_URL || ''

  result.environmentPresence = {
    CLOUDFLARE_ACCOUNT_ID: {
      status: cfAccountId ? 'PRESENT' : 'MISSING',
      length: cfAccountId.length,
      scope: process.env.VERCEL_ENV || 'unknown',
    },
    CLOUDFLARE_AI_API_TOKEN: {
      status: cfAiToken ? 'PRESENT' : 'MISSING',
      length: cfAiToken.length,
      scope: process.env.VERCEL_ENV || 'unknown',
    },
    CLOUDFLARE_API_TOKEN_ALIAS: {
      status: cfTokenFallback ? 'PRESENT' : 'MISSING',
      length: cfTokenFallback.length,
    },
    GROQ_API_KEY: {
      status: groqKey ? 'PRESENT' : 'MISSING',
      length: groqKey.length,
      scope: process.env.VERCEL_ENV || 'unknown',
    },
    DATABASE_URL: {
      status: dbUrl ? 'PRESENT' : 'MISSING',
      length: dbUrl.length,
    },
  }

  // ---------------------------------------------------------------------------
  // 2. Diagnose Cloudflare Workers AI Directly
  // ---------------------------------------------------------------------------
  const activeCfToken = cfAiToken || cfTokenFallback
  if (!cfAccountId || !activeCfToken) {
    result.cloudflareDiagnostics = {
      tested: false,
      reason: 'Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_AI_API_TOKEN',
      hasAccountId: Boolean(cfAccountId),
      hasToken: Boolean(activeCfToken),
    }
  } else {
    try {
      const model = '@cf/baai/bge-small-en-v1.5'
      const url = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/${model}`
      const testPrompt = 'Elite Construction Company provides civil engineering services.'

      const cfRes = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${activeCfToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: [testPrompt],
        }),
      })

      const rawText = await cfRes.text()
      let parsed: any = null
      try {
        parsed = JSON.parse(rawText)
      } catch {
        parsed = null
      }

      const vec = parsed?.result?.data?.[0] || (Array.isArray(parsed?.result?.data) && typeof parsed?.result?.data[0] === 'number' ? parsed?.result?.data : null)
      const dimension = Array.isArray(vec) ? vec.length : null

      result.cloudflareDiagnostics = {
        tested: true,
        httpStatus: cfRes.status,
        success: cfRes.ok && (parsed?.success ?? true),
        cloudflareErrorCode: parsed?.errors?.[0]?.code ?? null,
        cloudflareErrorMessage: parsed?.errors?.[0]?.message ?? (!cfRes.ok ? rawText.slice(0, 300) : null),
        embeddingDimension: dimension,
        vectorNormalized: dimension === 384,
      }
    } catch (err: any) {
      result.cloudflareDiagnostics = {
        tested: true,
        success: false,
        error: err?.message || String(err),
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Diagnose Groq Directly
  // ---------------------------------------------------------------------------
  if (!groqKey) {
    result.groqDiagnostics = {
      tested: false,
      reason: 'Missing GROQ_API_KEY',
    }
  } else {
    try {
      const groqUrl = 'https://api.groq.com/openai/v1/chat/completions'
      const model = 'llama-3.3-70b-versatile'

      const gRes = await fetch(groqUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: 'Reply with exactly: GROQ_OK',
            },
          ],
          max_tokens: 10,
          temperature: 0.0,
        }),
      })

      const rawText = await gRes.text()
      let parsed: any = null
      try {
        parsed = JSON.parse(rawText)
      } catch {
        parsed = null
      }

      result.groqDiagnostics = {
        tested: true,
        httpStatus: gRes.status,
        authSuccess: gRes.status !== 401 && gRes.status !== 403,
        modelAvailable: gRes.status !== 404,
        groqErrorCode: parsed?.error?.code ?? null,
        groqErrorMessage: parsed?.error?.message ?? (!gRes.ok ? rawText.slice(0, 300) : null),
        promptTokens: parsed?.usage?.prompt_tokens ?? null,
        completionTokens: parsed?.usage?.completion_tokens ?? null,
        responseText: parsed?.choices?.[0]?.message?.content ?? null,
      }
    } catch (err: any) {
      result.groqDiagnostics = {
        tested: true,
        success: false,
        error: err?.message || String(err),
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Independently Verify pgvector (Safe read-only)
  // ---------------------------------------------------------------------------
  try {
    const extRows: any = await prisma.$queryRawUnsafe(
      "SELECT extversion FROM pg_extension WHERE extname = 'vector';"
    )
    const isInstalled = Array.isArray(extRows) && extRows.length > 0
    const extVersion = isInstalled ? extRows[0].extversion : null

    // Check table and embedding column if table exists
    let columnType: string | null = null
    let configuredDimension: number | null = null

    try {
      const colRows: any = await prisma.$queryRawUnsafe(`
        SELECT column_name, data_type, udt_name 
        FROM information_schema.columns 
        WHERE table_name = 'rag_chunks' AND column_name = 'embedding';
      `)
      if (Array.isArray(colRows) && colRows.length > 0) {
        columnType = `${colRows[0].data_type} (${colRows[0].udt_name})`
      }

      const dimRows: any = await prisma.$queryRawUnsafe(`
        SELECT atttypmod 
        FROM pg_attribute 
        WHERE attrelid = 'rag_chunks'::regclass AND attname = 'embedding';
      `)
      if (Array.isArray(dimRows) && dimRows.length > 0) {
        // atttypmod for vector(N) equals N
        configuredDimension = dimRows[0].atttypmod > 0 ? dimRows[0].atttypmod : null
      }
    } catch {
      // rag_chunks table might not exist yet or have different permissions
    }

    // Test a simple vector calculation to verify engine readiness
    let vectorCastTest = false
    try {
      const testVec: any = await prisma.$queryRawUnsafe("SELECT '[1,2,3]'::vector AS test;")
      vectorCastTest = Array.isArray(testVec) && testVec.length > 0
    } catch {
      vectorCastTest = false
    }

    result.pgvectorDiagnostics = {
      installed: isInstalled ? 'YES' : 'NO',
      version: extVersion,
      vectorCastFunctional: vectorCastTest,
      ragChunksEmbeddingColumn: columnType,
      configuredDimension: configuredDimension,
    }
  } catch (err: any) {
    result.pgvectorDiagnostics = {
      installed: 'ERROR',
      error: err?.message || String(err),
    }
  }

  return NextResponse.json({
    success: true,
    data: result,
  })
}
