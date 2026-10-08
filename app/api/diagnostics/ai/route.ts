// =============================================================================
// ELITEBUILD — Server-Side AI Provider, pgvector Migration & Diagnostics Route
// =============================================================================
// 1. Direct Cloudflare Workers AI test (@cf/baai/bge-small-en-v1.5, exactly 384-dim)
// 2. Direct Groq test (qwen/qwen3.8-27b, prompt/completion tokens > 0)
// 3. Safe pgvector migration: rag_chunks.embedding -> vector(384)
// 4. Seeding real 384-dim embeddings for verified corporate knowledge
// 5. Verification of dense retrieval, RBAC/ABAC isolation, citations
// =============================================================================

import { NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { VERIFIED_ELITEBUILD_CHUNKS } from '@/lib/rag/trial/knowledge'
import { getCloudflareEmbedding } from '@/lib/rag/trial/cloudflare'
import { retrieveAuthorizedChunks } from '@/lib/rag/trial/retrieval'
import { generateGroundedAnswer } from '@/lib/rag/trial/groq'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60s for full embedding indexing on Vercel Pro/Hobby

export async function GET() {
  const result: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    deploymentInfo: {
      vercelEnv: process.env.VERCEL_ENV || 'unknown',
      gitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA ? process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7) : 'local',
      gitCommitMessage: process.env.VERCEL_GIT_COMMIT_MESSAGE || null,
      ragMode: process.env.RAG_MODE || 'unconfigured',
      groqModel: process.env.GROQ_MODEL || 'unconfigured',
      embeddingModel: process.env.EMBEDDING_MODEL || 'unconfigured',
      embeddingProvider: process.env.EMBEDDING_PROVIDER || 'unconfigured',
      vectorDimension: process.env.VECTOR_DIMENSION || 'unconfigured',
      rerankerModel: process.env.RERANKER_MODEL || 'unconfigured',
      rerankerProvider: process.env.RERANKER_PROVIDER || 'unconfigured',
    },
    environmentPresence: {},
    cloudflareDiagnostics: {},
    groqDiagnostics: {},
    pgvectorDiagnostics: {},
  }

  // ---------------------------------------------------------------------------
  // 1. Runtime Environment Presence (NEVER print secret values)
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
  // 2. Direct Cloudflare Workers AI Test (@cf/baai/bge-small-en-v1.5)
  // ---------------------------------------------------------------------------
  const activeCfToken = cfAiToken || cfTokenFallback
  if (!cfAccountId || !activeCfToken) {
    result.cloudflareDiagnostics = {
      tested: false,
      reason: 'Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_AI_API_TOKEN',
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

      const rawData = parsed?.result?.data
      let dimension: number | null = null
      if (Array.isArray(rawData)) {
        if (Array.isArray(rawData[0])) {
          dimension = rawData[0].length
        } else if (typeof rawData[0] === 'number') {
          dimension = rawData.length
        }
      }

      result.cloudflareDiagnostics = {
        tested: true,
        httpStatus: cfRes.status,
        success: cfRes.ok && (parsed?.success ?? true),
        embeddingModel: model,
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
  // 3. Direct Groq Test (qwen/qwen3.8-27b)
  // ---------------------------------------------------------------------------
  if (!groqKey) {
    result.groqDiagnostics = {
      tested: false,
      reason: 'Missing GROQ_API_KEY',
    }
  } else {
    try {
      const groqUrl = 'https://api.groq.com/openai/v1/chat/completions'
      const model = 'qwen/qwen3.8-27b'

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
          max_tokens: 15,
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

      const sampleEvidence = `[1] Document: doc-services\n    Section: Services > Core Capabilities\n    Version: 1.0.0\n    Source Authority: VERIFIED_COMPANY_RECORD\n    Evidence:\n    ELITE CONSTRUCTION COMPANY provides six verified core engineering and construction services: 1. Civil Construction (highways, roads, bridges, structural concrete, and buildings).`

      const groundedTestRes = await fetch(groqUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: 'You are the ELITEBUILD Knowledge Assistant. Answer using verified evidence with [1] citations.',
            },
            {
              role: 'user',
              content: `User Question: What services does Elite Construction provide?\n\n<verified_evidence>\n${sampleEvidence}\n</verified_evidence>\n\nPlease provide a grounded factual answer citing the evidence with [1].`,
            },
          ],
          max_tokens: 500,
          temperature: 0.0,
        }),
      })

      const rawGroundedText = await groundedTestRes.text()
      let parsedGrounded: any = null
      try {
        parsedGrounded = JSON.parse(rawGroundedText)
      } catch {
        parsedGrounded = null
      }

      result.groqDiagnostics = {
        tested: true,
        httpStatus: gRes.status,
        authSuccess: gRes.status !== 401 && gRes.status !== 403,
        modelAvailable: gRes.status !== 404,
        modelUsed: model,
        promptTokens: parsed?.usage?.prompt_tokens ?? null,
        completionTokens: parsed?.usage?.completion_tokens ?? null,
        responseText: parsed?.choices?.[0]?.message?.content ?? null,
        groundedTest: {
          httpStatus: groundedTestRes.status,
          success: groundedTestRes.ok,
          promptTokens: parsedGrounded?.usage?.prompt_tokens ?? null,
          completionTokens: parsedGrounded?.usage?.completion_tokens ?? null,
          responseText: parsedGrounded?.choices?.[0]?.message?.content ?? null,
          errorMessage: !groundedTestRes.ok ? rawGroundedText.slice(0, 300) : null,
        },
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
  // 4. pgvector Extension & Table Diagnostics
  // ---------------------------------------------------------------------------
  try {
    const extRows: any = await prisma.$queryRawUnsafe(
      `SELECT e.extname, e.extversion, n.nspname 
       FROM pg_extension e 
       JOIN pg_namespace n ON e.extnamespace = n.oid 
       WHERE e.extname = 'vector';`
    )
    const isInstalled = Array.isArray(extRows) && extRows.length > 0
    const extVersion = isInstalled ? extRows[0].extversion : null
    const extNamespace = isInstalled ? extRows[0].nspname : null

    let columnType: string | null = null
    let configuredDimension: number | null = null
    let rowCount: number | null = null
    let documentsCount: number | null = null

    try {
      const countRows: any = await prisma.$queryRawUnsafe("SELECT count(*) as c FROM rag_chunks;")
      rowCount = countRows?.[0]?.c ? Number(countRows[0].c) : 0
    } catch {
      // ignore
    }

    try {
      const docCountRows: any = await prisma.$queryRawUnsafe("SELECT count(*) as c FROM rag_documents;")
      documentsCount = docCountRows?.[0]?.c ? Number(docCountRows[0].c) : 0
    } catch {
      // ignore
    }

    try {
      const colRows: any = await prisma.$queryRawUnsafe(`
        SELECT column_name, data_type, udt_name, udt_schema 
        FROM information_schema.columns 
        WHERE table_name = 'rag_chunks' AND column_name = 'embedding';
      `)
      if (Array.isArray(colRows) && colRows.length > 0) {
        columnType = `${colRows[0].data_type} (${colRows[0].udt_schema}.${colRows[0].udt_name})`
      }

      const dimRows: any = await prisma.$queryRawUnsafe(`
        SELECT atttypmod 
        FROM pg_attribute 
        WHERE attrelid = 'rag_chunks'::regclass AND attname = 'embedding';
      `)
      if (Array.isArray(dimRows) && dimRows.length > 0) {
        configuredDimension = dimRows[0].atttypmod > 0 ? dimRows[0].atttypmod : null
      }
    } catch {
      // ignore
    }

    result.pgvectorDiagnostics = {
      installed: isInstalled ? 'YES' : 'NO',
      version: extVersion,
      namespace: extNamespace,
      ragDocumentsRowCount: documentsCount,
      ragChunksRowCount: rowCount,
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

export async function POST(request: Request) {
  const log: string[] = []
  const startTime = Date.now()

  try {
    const body = await request.json().catch(() => ({}))
    const forceReseed = body.forceReseed === true

    // Step 1: Check existing row count
    log.push('Step 1: Checking row counts of rag_chunks and rag_documents')
    let currentChunkCount = 0
    try {
      const countRes: any = await prisma.$queryRawUnsafe('SELECT count(*) as c FROM rag_chunks;')
      currentChunkCount = countRes?.[0]?.c ? Number(countRes[0].c) : 0
      log.push(`rag_chunks row count: ${currentChunkCount}`)
    } catch (err: any) {
      log.push(`rag_chunks count error (table might need creation): ${err?.message || err}`)
    }

    // Step 2: Ensure tables exist
    log.push('Step 2: Ensuring rag_documents and rag_chunks tables exist')
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS rag_documents (
        id VARCHAR(64) PRIMARY KEY,
        document_id VARCHAR(255) NOT NULL UNIQUE,
        tenant_id VARCHAR(128) NOT NULL DEFAULT 'elitebuild-core',
        source_type VARCHAR(64) NOT NULL,
        source_reference VARCHAR(512),
        title VARCHAR(512) NOT NULL,
        version_tag VARCHAR(64) NOT NULL DEFAULT '1.0',
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        security_access_level VARCHAR(32) NOT NULL DEFAULT 'PUBLIC',
        jurisdiction VARCHAR(32) NOT NULL DEFAULT 'PK',
        source_authority VARCHAR(64) NOT NULL DEFAULT 'UNKNOWN',
        content_hash VARCHAR(128),
        content_status VARCHAR(32) NOT NULL DEFAULT 'PUBLISHED',
        ingestion_status VARCHAR(64) NOT NULL DEFAULT 'COMPLETED',
        chunk_count INTEGER NOT NULL DEFAULT 1,
        raw_text_length INTEGER NOT NULL DEFAULT 0,
        metadata_json TEXT,
        error_message TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `)

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS rag_chunks (
        id VARCHAR(64) PRIMARY KEY,
        chunk_id VARCHAR(255) NOT NULL UNIQUE,
        document_id VARCHAR(255) NOT NULL,
        rag_document_id VARCHAR(64),
        tenant_id VARCHAR(128) NOT NULL DEFAULT 'elitebuild-core',
        chunk_index INTEGER NOT NULL DEFAULT 0,
        heading_path VARCHAR(1024),
        chunk_text TEXT NOT NULL,
        char_count INTEGER NOT NULL DEFAULT 0,
        token_estimate INTEGER NOT NULL DEFAULT 0,
        embedding vector(384),
        security_access_level VARCHAR(32) NOT NULL DEFAULT 'PUBLIC',
        source_authority VARCHAR(64) NOT NULL DEFAULT 'UNKNOWN',
        version_tag VARCHAR(64) NOT NULL DEFAULT '1.0',
        jurisdiction VARCHAR(32) NOT NULL DEFAULT 'PK',
        content_hash VARCHAR(128),
        content_status VARCHAR(32) NOT NULL DEFAULT 'PUBLISHED',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `)

    // Step 3: Check current dimension & safely migrate embedding column
    log.push('Step 3: Checking dimension and migrating rag_chunks.embedding to vector(384)')
    const dimRows: any = await prisma.$queryRawUnsafe(`
      SELECT atttypmod 
      FROM pg_attribute 
      WHERE attrelid = 'rag_chunks'::regclass AND attname = 'embedding';
    `)
    const currentDim = dimRows?.[0]?.atttypmod

    if (currentDim !== 384) {
      log.push(`Migrating embedding column from dim ${currentDim} to vector(384)`)
      // If table has 0 rows or forceReseed, alter column type
      if (currentChunkCount === 0 || forceReseed) {
        if (forceReseed && currentChunkCount > 0) {
          log.push('Clearing outdated chunks for clean re-indexing')
          await prisma.$executeRawUnsafe('DELETE FROM rag_chunks;')
          await prisma.$executeRawUnsafe('DELETE FROM rag_documents;')
        }
        await prisma.$executeRawUnsafe('ALTER TABLE rag_chunks ALTER COLUMN embedding TYPE vector(384);')
        log.push('Column altered to vector(384) successfully')
      } else {
        throw new Error(`rag_chunks has ${currentChunkCount} rows and cannot be altered without forceReseed=true`)
      }
    } else {
      log.push('rag_chunks.embedding is already vector(384)')
    }

    // Ensure index exists
    log.push('Step 4: Ensuring HNSW vector index on rag_chunks.embedding')
    try {
      await prisma.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS ix_rag_chunks_embedding ON rag_chunks USING hnsw (embedding vector_cosine_ops);'
      )
      log.push('HNSW index ensured')
    } catch (idxErr: any) {
      log.push(`Index note: ${idxErr?.message || idxErr}`)
    }

    // Step 5: Index verified corporate knowledge with real Cloudflare 384-dim embeddings
    log.push('Step 5: Generating real 384-dimensional Cloudflare embeddings for verified chunks')
    const chunksToIndex = VERIFIED_ELITEBUILD_CHUNKS
    let indexedCount = 0

    // Check if chunks already exist
    const checkCount: any = await prisma.$queryRawUnsafe('SELECT count(*) as c FROM rag_chunks;')
    const existingChunks = Number(checkCount?.[0]?.c || 0)

    if (existingChunks < chunksToIndex.length || forceReseed) {
      for (const chunk of chunksToIndex) {
        // 1. Get real embedding from Cloudflare Workers AI
        const embedding = await getCloudflareEmbedding(chunk.chunk_text)
        if (!embedding || embedding.length !== 384) {
          throw new Error(`Failed to get real 384-dim embedding for chunk ${chunk.chunk_id}. Got: ${embedding?.length ?? 'null'}`)
        }

        const vecLiteral = `[${embedding.join(',')}]`

        // 2. Upsert document via delete then insert
        const docId = chunk.document_id
        await prisma.$executeRawUnsafe('DELETE FROM rag_documents WHERE document_id = $1;', docId)
        await prisma.$executeRawUnsafe(
          `
          INSERT INTO rag_documents (
            id, document_id, tenant_id, source_type, title, version_tag,
            timestamp, security_access_level, jurisdiction, source_authority,
            content_hash, content_status, ingestion_status, chunk_count, raw_text_length,
            created_at, updated_at
          ) VALUES (
            $1, $2, 'elitebuild-core', 'VERIFIED_RECORD', $3, $4,
            NOW(), $5, $6, $7,
            $8, 'PUBLISHED', 'COMPLETED', 1, $9,
            NOW(), NOW()
          );
          `,
          `doc-pk-${docId}`,
          docId,
          chunk.heading_path || docId,
          chunk.version_tag,
          chunk.security_access_level,
          chunk.jurisdiction,
          chunk.source_authority,
          chunk.content_hash,
          chunk.char_count
        )

        // 3. Upsert chunk with vector via delete then insert
        await prisma.$executeRawUnsafe('DELETE FROM rag_chunks WHERE chunk_id = $1;', chunk.chunk_id)
        await prisma.$executeRawUnsafe(
          `
          INSERT INTO rag_chunks (
            id, chunk_id, document_id, rag_document_id, tenant_id,
            chunk_index, heading_path, chunk_text, char_count, token_estimate,
            embedding, security_access_level, source_authority, version_tag,
            timestamp, jurisdiction, content_hash, content_status, created_at
          ) VALUES (
            $1, $2, $3, $4, 'elitebuild-core',
            $5, $6, $7, $8, $9,
            $10::vector, $11, $12, $13,
            NOW(), $14, $15, 'PUBLISHED', NOW()
          );
          `,
          `chk-pk-${chunk.chunk_id}`,
          chunk.chunk_id,
          docId,
          `doc-pk-${docId}`,
          chunk.chunk_index,
          chunk.heading_path,
          chunk.chunk_text,
          chunk.char_count,
          Math.ceil(chunk.char_count / 4),
          vecLiteral,
          chunk.security_access_level,
          chunk.source_authority,
          chunk.version_tag,
          chunk.jurisdiction,
          chunk.content_hash
        )

        indexedCount++
      }
      log.push(`Successfully indexed ${indexedCount} chunks with real 384-dim embeddings`)
    } else {
      log.push(`All ${existingChunks} chunks already present in rag_chunks`)
      indexedCount = existingChunks
    }

    // Step 6: Verify actual pgvector similarity retrieval works
    log.push('Step 6: Testing pgvector dense retrieval')
    const testQuery = 'What engineering and construction services does Elite Construction provide?'
    const queryVector = await getCloudflareEmbedding(testQuery)

    let denseRetrievalVerified = false
    let topMatchTitle: string | null = null
    let topSimilarity: number | null = null

    if (queryVector && queryVector.length === 384) {
      const retrievalRes = await retrieveAuthorizedChunks({
        query: testQuery,
        queryVector,
        userRole: 'PUBLIC',
        topK: 3,
      })

      if (retrievalRes.mode === 'SEMANTIC' && retrievalRes.chunks.length > 0) {
        denseRetrievalVerified = true
        topMatchTitle = retrievalRes.chunks[0].heading_path || retrievalRes.chunks[0].chunk_id
        topSimilarity = retrievalRes.chunks[0].similarity || null
        log.push(`Dense retrieval SUCCESS: top match "${topMatchTitle}" with similarity ${topSimilarity?.toFixed(4)} (mode: ${retrievalRes.mode})`)
      } else {
        log.push(`Dense retrieval returned mode: ${retrievalRes.mode}, chunks: ${retrievalRes.chunks.length}`)
      }
    }

    // Step 7: Verify RBAC/ABAC isolation (Private chunk must NOT be accessible to PUBLIC)
    log.push('Step 7: Verifying security isolation of private evidence')
    const privateQuery = 'executive payroll schedules confidential audit'
    const privateVector = await getCloudflareEmbedding(privateQuery)
    const publicRetrieval = await retrieveAuthorizedChunks({
      query: privateQuery,
      queryVector: privateVector,
      userRole: 'PUBLIC',
      topK: 5,
    })
    const publicFoundPrivate = publicRetrieval.chunks.some((c) => c.document_id === 'doc-internal-audit-2025' || c.security_access_level === 'PRIVATE')

    const superAdminRetrieval = await retrieveAuthorizedChunks({
      query: privateQuery,
      queryVector: privateVector,
      userRole: 'SUPER_ADMIN',
      topK: 5,
    })
    const adminFoundPrivate = superAdminRetrieval.chunks.some((c) => c.document_id === 'doc-internal-audit-2025')

    const securityIsolationVerified = !publicFoundPrivate && adminFoundPrivate
    log.push(`Security isolation: PUBLIC accessed private = ${publicFoundPrivate}, SUPER_ADMIN accessed private = ${adminFoundPrivate}`)

    // Step 8: Verify Groq grounded generation with real qwen/qwen3.8-27b
    log.push('Step 8: Testing grounded Groq generation with qwen/qwen3.8-27b')
    let generationVerified = false
    let answerText = ''
    let promptTokens = 0
    let completionTokens = 0

    if (queryVector && queryVector.length === 384) {
      const semResult = await retrieveAuthorizedChunks({
        query: testQuery,
        queryVector,
        userRole: 'PUBLIC',
        topK: 3,
      })

      const evidenceBlocks = semResult.chunks.map((c, i) => ({
        citationIndex: i + 1,
        documentId: c.document_id,
        chunkId: c.chunk_id,
        title: c.heading_path || c.document_id,
        headingPath: c.heading_path,
        sourceAuthority: c.source_authority,
        versionTag: c.version_tag,
        text: c.chunk_text,
        similarity: c.similarity ?? 0.5,
      }))

      const genRes = await generateGroundedAnswer(testQuery, evidenceBlocks, {
        model: 'qwen/qwen3.8-27b',
      })

      answerText = genRes.answer
      promptTokens = genRes.tokens.prompt
      completionTokens = genRes.tokens.completion
      generationVerified = genRes.status === 'SUPPORTED' && promptTokens > 0 && completionTokens > 0 && answerText.includes('[')
      log.push(`Generation result: status=${genRes.status}, promptTokens=${promptTokens}, completionTokens=${completionTokens}, hasCitations=${answerText.includes('[')}`)
    }

    const totalDuration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      data: {
        totalDurationMs: totalDuration,
        migrationSuccess: true,
        canonicalDimension: 384,
        indexedChunks: indexedCount,
        denseRetrievalVerified,
        topMatchTitle,
        topSimilarity,
        securityIsolationVerified,
        generationVerified,
        sampleAnswer: answerText.slice(0, 300),
        tokens: { prompt: promptTokens, completion: completionTokens },
        log,
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || String(err),
        log,
      },
      { status: 500 }
    )
  }
}
