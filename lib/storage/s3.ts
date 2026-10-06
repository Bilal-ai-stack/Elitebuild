// =============================================================================
// ELITEBUILD — S3 / Cloudflare R2 Persistent Object Storage Provider (Step 19C.2)
// =============================================================================
// Provides zero-external-dependency AWS S3 / Cloudflare R2 compatible storage.
// Implements AWS Signature Version 4 (SigV4) using native Node.js crypto.
// Supports:
// 1. Public media storage (project photos, company assets) with CDN prefix
// 2. Private confidential document storage with SigV4 authenticated streams
// =============================================================================

import { createHmac, createHash } from 'crypto'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import type { StorageProvider, UploadResult, SecureDocumentUploadResult } from './index.ts'
import { isSafeFileName } from './index.ts'

export interface S3Config {
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  region: string
  endpoint?: string // e.g. https://<account-id>.r2.cloudflarestorage.com
  publicUrlPrefix?: string // e.g. https://cdn.eliteconstruction.pk or custom domain
}

const ALLOWED_DOCUMENT_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.txt',
])

function sha256(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex')
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data).digest()
}

function getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string): Buffer {
  const kDate = hmacSha256(`AWS4${key}`, dateStamp)
  const kRegion = hmacSha256(kDate, regionName)
  const kService = hmacSha256(kRegion, serviceName)
  const kSigning = hmacSha256(kService, 'aws4_request')
  return kSigning
}

export function normalizeRegion(region?: string): string {
  if (!region || !region.trim()) return 'auto'
  const clean = region.trim().toLowerCase()
  if (clean.includes('apac') || clean.includes('asia')) return 'apac'
  if (clean.includes('wnam')) return 'wnam'
  if (clean.includes('enam')) return 'enam'
  if (clean.includes('weur')) return 'weur'
  if (clean.includes('eeur')) return 'eeur'
  if (clean.includes('oc')) return 'oc'
  if (/^[a-z0-9-]+$/.test(clean)) return clean
  return 'auto'
}

export class S3StorageProvider implements StorageProvider {
  private config: S3Config
  private serverTimeOffsetMs = 0

  constructor(config?: Partial<S3Config>) {
    this.config = {
      bucket: config?.bucket !== undefined ? config.bucket : (process.env.STORAGE_BUCKET || ''),
      accessKeyId: config?.accessKeyId !== undefined ? config.accessKeyId : (process.env.STORAGE_ACCESS_KEY || ''),
      secretAccessKey: config?.secretAccessKey !== undefined ? config.secretAccessKey : (process.env.STORAGE_SECRET_KEY || ''),
      region: normalizeRegion(config?.region !== undefined ? config.region : process.env.STORAGE_REGION),
      endpoint: config?.endpoint !== undefined ? config.endpoint : (process.env.STORAGE_ENDPOINT || undefined),
      publicUrlPrefix: config?.publicUrlPrefix !== undefined ? config.publicUrlPrefix : (process.env.STORAGE_PUBLIC_URL_PREFIX || undefined),
    }
  }

  public recordResponseDate(dateHeader: string | null): void {
    if (!dateHeader) return
    const serverTimestamp = new Date(dateHeader).getTime()
    if (!isNaN(serverTimestamp)) {
      this.serverTimeOffsetMs = serverTimestamp - Date.now()
    }
  }

  public isConfigured(): boolean {
    return Boolean(this.config.bucket && this.config.accessKeyId && this.config.secretAccessKey)
  }

  public getHostAndUrl(objectKey: string): { host: string; url: string } {
    const rawEndpoint = this.config.endpoint?.replace(/^https?:\/\//, '').replace(/\/$/, '')
    if (rawEndpoint) {
      // Cloudflare R2 / Custom endpoint: https://<endpoint>/<bucket>/<key>
      const host = rawEndpoint
      const url = `https://${host}/${this.config.bucket}/${objectKey}`
      return { host, url }
    } else {
      // Standard AWS S3: https://<bucket>.s3.<region>.amazonaws.com/<key>
      const host = `${this.config.bucket}.s3.${this.config.region}.amazonaws.com`
      const url = `https://${host}/${objectKey}`
      return { host, url }
    }
  }

  public signRequest(
    method: string,
    objectKey: string,
    payload: Buffer | '',
    headers: Record<string, string>,
    dateOverride?: Date
  ): Record<string, string> {
    const now = dateOverride || new Date(Date.now() + this.serverTimeOffsetMs)
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '') // e.g. 20261002T000000Z
    const dateStamp = amzDate.slice(0, 8) // e.g. 20261002

    const { host } = this.getHostAndUrl(objectKey)
    const payloadHash = sha256(payload)

    const allHeaders: Record<string, string> = {
      ...headers,
      host,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
    }

    const signedHeaderKeys = Object.keys(allHeaders).sort()
    const signedHeaders = signedHeaderKeys.join(';')

    const canonicalHeaders = signedHeaderKeys
      .map((k) => `${k.toLowerCase()}:${allHeaders[k].trim()}\n`)
      .join('')

    const endpointPath = this.config.endpoint ? `/${this.config.bucket}/${objectKey}` : `/${objectKey}`

    const canonicalRequest = [
      method,
      endpointPath,
      '', // query string
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n')

    const credentialScope = `${dateStamp}/${this.config.region}/s3/aws4_request`
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      sha256(canonicalRequest),
    ].join('\n')

    const signingKey = getSignatureKey(this.config.secretAccessKey, dateStamp, this.config.region, 's3')
    const signature = hmacSha256(signingKey, stringToSign).toString('hex')

    const authorization = `AWS4-HMAC-SHA256 Credential=${this.config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

    return {
      ...allHeaders,
      Authorization: authorization,
    }
  }

  private async signedFetch(
    method: string,
    objectKey: string,
    payload: Buffer | '',
    customHeaders: Record<string, string> = {}
  ): Promise<Response> {
    const { url } = this.getHostAndUrl(objectKey)
    const headers = this.signRequest(method, objectKey, payload, customHeaders)
    const body = Buffer.isBuffer(payload) && payload.length > 0 ? new Uint8Array(payload.buffer, payload.byteOffset, payload.byteLength) : undefined

    let res = await fetch(url, {
      method,
      headers,
      body,
    })
    this.recordResponseDate(res.headers.get('date'))

    // If 403 clock skew error, sync offset and retry once
    if (res.status === 403) {
      const clone = res.clone()
      const text = await clone.text().catch(() => '')
      if (text.includes('RequestTimeTooSkewed') && res.headers.get('date')) {
        const retryHeaders = this.signRequest(method, objectKey, payload, customHeaders)
        res = await fetch(url, {
          method,
          headers: retryHeaders,
          body,
        })
        this.recordResponseDate(res.headers.get('date'))
      }
    }

    return res
  }

  // ---------------------------------------------------------------------------
  // Public Media
  // ---------------------------------------------------------------------------

  async upload(file: Buffer, originalName: string, mimeType: string): Promise<UploadResult> {
    if (!this.isConfigured()) {
      throw new Error('S3 / Cloudflare R2 storage credentials are not configured')
    }

    const ext = path.extname(originalName) || '.jpg'
    const fileName = `${uuidv4()}${ext}`
    const subDir = mimeType.startsWith('image/') ? 'images' : 'media'
    const objectKey = `uploads/${subDir}/${fileName}`

    const { url } = this.getHostAndUrl(objectKey)

    const response = await this.signedFetch('PUT', objectKey, file, {
      'content-type': mimeType,
      'content-length': file.length.toString(),
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      throw new Error(`S3 upload failed (${response.status}): ${errText.slice(0, 100)}`)
    }

    const publicUrl = this.config.publicUrlPrefix
      ? `${this.config.publicUrlPrefix.replace(/\/$/, '')}/${objectKey}`
      : url

    return {
      url: publicUrl,
      fileName,
      fileSize: file.length,
      mimeType,
    }
  }

  async delete(fileUrl: string): Promise<void> {
    if (!this.isConfigured()) return

    try {
      let objectKey = ''
      if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
        const urlObj = new URL(fileUrl)
        objectKey = urlObj.pathname.replace(/^\//, '')
        if (objectKey.startsWith(`${this.config.bucket}/`)) {
          objectKey = objectKey.slice(this.config.bucket.length + 1)
        }
      } else {
        const base = path.basename(fileUrl)
        if (!isSafeFileName(base)) return
        objectKey = `uploads/media/${base}`
      }

      if (objectKey) {
        await this.signedFetch('DELETE', objectKey, '', {}).catch(() => {})
      }
    } catch {
      // Safely ignore invalid URL format or traversal
    }
  }

  getUrl(fileName: string): string {
    const objectKey = `uploads/media/${path.basename(fileName)}`
    if (this.config.publicUrlPrefix) {
      return `${this.config.publicUrlPrefix.replace(/\/$/, '')}/${objectKey}`
    }
    const { url } = this.getHostAndUrl(objectKey)
    return url
  }

  // ---------------------------------------------------------------------------
  // Confidential Document Storage (Private R2/S3 Objects)
  // ---------------------------------------------------------------------------

  async uploadSecureDocument(
    file: Buffer,
    originalName: string,
    mimeType: string
  ): Promise<SecureDocumentUploadResult> {
    if (!this.isConfigured()) {
      throw new Error('S3 / Cloudflare R2 storage credentials are not configured')
    }

    const rawExt = path.extname(originalName).toLowerCase()
    const ext = ALLOWED_DOCUMENT_EXTENSIONS.has(rawExt) ? rawExt : '.bin'
    const storageKey = `${uuidv4()}${ext}`
    const objectKey = `documents/${storageKey}`

    const response = await this.signedFetch('PUT', objectKey, file, {
      'content-type': mimeType,
      'content-length': file.length.toString(),
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      throw new Error(`S3 secure document upload failed (${response.status}): ${errText.slice(0, 100)}`)
    }

    return {
      fileName: storageKey,
      fileSize: file.length,
      mimeType,
      storageKey,
    }
  }

  async fetchSecureDocumentStream(
    storageKeyOrFileName: string
  ): Promise<{ stream: ReadableStream<Uint8Array>; size: number; mimeType?: string } | null> {
    if (!this.isConfigured()) return null

    let cleanKey = storageKeyOrFileName.trim()
    if (cleanKey.startsWith('secure:')) {
      cleanKey = cleanKey.replace(/^secure:/, '')
    } else if (cleanKey.includes('/')) {
      cleanKey = path.basename(cleanKey)
    }

    if (!isSafeFileName(cleanKey)) {
      return null
    }

    const objectKey = `documents/${cleanKey}`

    try {
      const response = await this.signedFetch('GET', objectKey, '', {})

      if (!response.ok || !response.body) {
        return null
      }

      const contentLength = parseInt(response.headers.get('content-length') || '0', 10)
      const mimeType = response.headers.get('content-type') || undefined

      return {
        stream: response.body as ReadableStream<Uint8Array>,
        size: contentLength,
        mimeType,
      }
    } catch {
      return null
    }
  }

  async deleteSecureDocument(storageKeyOrFileName: string): Promise<void> {
    if (!this.isConfigured()) return

    let cleanKey = storageKeyOrFileName.trim()
    if (cleanKey.startsWith('secure:')) {
      cleanKey = cleanKey.replace(/^secure:/, '')
    } else if (cleanKey.includes('/')) {
      cleanKey = path.basename(cleanKey)
    }

    if (!isSafeFileName(cleanKey)) return

    const objectKey = `documents/${cleanKey}`
    await this.signedFetch('DELETE', objectKey, '', {}).catch(() => {})
  }
}

// ---------------------------------------------------------------------------
// Standalone Secure Document Functions (for direct S3 / R2 access)
// ---------------------------------------------------------------------------

let s3Instance: S3StorageProvider | null = null

function getS3Instance(config?: Partial<S3Config>): S3StorageProvider {
  if (!s3Instance || config) {
    s3Instance = new S3StorageProvider(config)
  }
  return s3Instance
}

export async function uploadSecureDocumentToS3(
  file: Buffer,
  originalName: string,
  mimeType: string,
  config?: Partial<S3Config>
): Promise<SecureDocumentUploadResult> {
  const provider = getS3Instance(config)
  return provider.uploadSecureDocument(file, originalName, mimeType)
}

export async function streamSecureDocumentFromS3(
  storageKeyOrFileName: string,
  config?: Partial<S3Config>
): Promise<{ stream: ReadableStream<Uint8Array>; size: number; mimeType?: string } | null> {
  const provider = getS3Instance(config)
  return provider.fetchSecureDocumentStream(storageKeyOrFileName)
}

export async function deleteSecureDocumentFromS3(
  storageKeyOrFileName: string,
  config?: Partial<S3Config>
): Promise<void> {
  const provider = getS3Instance(config)
  return provider.deleteSecureDocument(storageKeyOrFileName)
}
