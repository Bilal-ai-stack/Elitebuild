// =============================================================================
// ELITEBUILD — Storage & Document Security Layer
// =============================================================================
// Provides isolated storage for:
// 1. Public web assets (images, project media) in public/uploads/
// 2. Private/admin documents in secure storage outside public directory (storage/documents/)
// =============================================================================

import { writeFile, mkdir, unlink, stat } from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

export interface UploadResult {
  url: string
  thumbnailUrl?: string
  fileName: string
  fileSize: number
  mimeType: string
}

export interface SecureDocumentUploadResult {
  fileName: string
  fileSize: number
  mimeType: string
  storageKey: string
}

export interface StorageProvider {
  upload(file: Buffer, fileName: string, mimeType: string): Promise<UploadResult>
  delete(fileUrl: string): Promise<void>
  getUrl(fileName: string): string
}

// ---------------------------------------------------------------------------
// Path validation utilities (Defense in depth against Path Traversal)
// ---------------------------------------------------------------------------

/**
 * Validates that a filename contains only safe characters and no directory traversal tokens.
 */
export function isSafeFileName(fileName: string): boolean {
  if (!fileName || typeof fileName !== 'string') return false
  // Reject null bytes, traversal tokens, directory separators, and drive letters
  if (fileName.includes('\0') || fileName.includes('..') || fileName.includes('/') || fileName.includes('\\') || fileName.includes(':')) {
    return false
  }
  // Sanity check: must be a single filename, not a relative or absolute path
  return path.basename(fileName) === fileName
}

/**
 * Returns the absolute path to the secure document storage root.
 * Defaults to `<projectRoot>/storage/documents`, or respects PRIVATE_STORAGE_ROOT.
 */
export function getPrivateStorageRoot(): string {
  const configured = process.env.PRIVATE_STORAGE_ROOT
  if (!configured) {
    return path.join(process.cwd(), 'storage', 'documents')
  }
  return path.isAbsolute(configured)
    ? path.resolve(/*turbopackIgnore: true*/ configured)
    : path.join(/*turbopackIgnore: true*/ process.cwd(), configured)
}

/**
 * Returns the absolute path to the public uploads root.
 */
export function getPublicUploadRoot(): string {
  return path.resolve(process.cwd(), 'public', 'uploads')
}

// ---------------------------------------------------------------------------
// Secure Document Storage Implementation
// ---------------------------------------------------------------------------

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

/**
 * Uploads a confidential or administrative document into the private storage directory.
 * The resulting file is NOT accessible from the public static web root.
 */
export async function uploadSecureDocument(
  file: Buffer,
  originalName: string,
  mimeType: string
): Promise<SecureDocumentUploadResult> {
  const storageDir = getPrivateStorageRoot()
  await mkdir(storageDir, { recursive: true })

  // Sanitize extension
  const rawExt = path.extname(originalName).toLowerCase()
  const ext = ALLOWED_DOCUMENT_EXTENSIONS.has(rawExt) ? rawExt : '.bin'

  // Generate non-enumerable, collision-free UUID storage filename
  const storageKey = `${uuidv4()}${ext}`
  const targetPath = path.resolve(storageDir, storageKey)

  // Verify path strictly resides within storageDir
  if (!targetPath.startsWith(storageDir + path.sep)) {
    throw new Error('Security exception: invalid target storage location')
  }

  await writeFile(targetPath, file)

  return {
    fileName: storageKey,
    fileSize: file.length,
    mimeType,
    storageKey,
  }
}

/**
 * Safely resolves the absolute filesystem path for a stored secure document.
 * Returns null if the path is invalid, traverses directories, or does not exist.
 */
export async function resolveSecureDocumentPath(storageKeyOrFileName: string): Promise<string | null> {
  if (!storageKeyOrFileName || typeof storageKeyOrFileName !== 'string') return null

  // Strip any legacy URL prefix if present (e.g., /uploads/documents/ or secure:)
  let cleanKey = storageKeyOrFileName.trim()
  if (cleanKey.startsWith('secure:')) {
    cleanKey = cleanKey.replace(/^secure:/, '')
  } else if (cleanKey.includes('/')) {
    cleanKey = path.basename(cleanKey)
  }

  // Validate filename safety
  if (!isSafeFileName(cleanKey)) {
    return null
  }

  const storageDir = getPrivateStorageRoot()
  const targetPath = path.resolve(storageDir, cleanKey)

  // Ensure resolved path is strictly inside the root
  if (!targetPath.startsWith(storageDir + path.sep)) {
    return null
  }

  try {
    const s = await stat(/*turbopackIgnore: true*/ targetPath)
    if (!s.isFile()) return null
    return targetPath
  } catch {
    // If not found in private storage, check if legacy file exists in public/uploads/documents
    // to support non-destructive migration of existing files.
    const legacyDir = path.resolve(process.cwd(), 'public', 'uploads', 'documents')
    const legacyPath = path.resolve(legacyDir, cleanKey)
    if (legacyPath.startsWith(legacyDir + path.sep)) {
      try {
        const ls = await stat(/*turbopackIgnore: true*/ legacyPath)
        if (ls.isFile()) return legacyPath
      } catch {
        return null
      }
    }
    return null
  }
}

/**
 * Deletes a secure document from private storage.
 */
export async function deleteSecureDocument(storageKeyOrFileName: string): Promise<void> {
  const filePath = await resolveSecureDocumentPath(storageKeyOrFileName)
  if (filePath) {
    try {
      await unlink(filePath)
    } catch {
      // Ignore if file doesn't exist
    }
  }
}

// ---------------------------------------------------------------------------
// Local filesystem provider for Public Media (Images, Logos)
// ---------------------------------------------------------------------------

class LocalStorageProvider implements StorageProvider {
  private uploadDir: string
  private publicPath: string

  constructor() {
    this.uploadDir = getPublicUploadRoot()
    this.publicPath = '/uploads'
  }

  async upload(file: Buffer, originalName: string, mimeType: string): Promise<UploadResult> {
    const ext = path.extname(originalName) || '.jpg'
    const fileName = `${uuidv4()}${ext}`
    const dir = this.getSubDir(mimeType)
    const fullDir = path.resolve(this.uploadDir, dir)

    await mkdir(fullDir, { recursive: true })
    const filePath = path.resolve(fullDir, fileName)

    if (!filePath.startsWith(this.uploadDir + path.sep)) {
      throw new Error('Security exception: invalid upload path')
    }

    await writeFile(filePath, file)

    return {
      url: `${this.publicPath}/${dir}/${fileName}`,
      fileName,
      fileSize: file.length,
      mimeType,
    }
  }

  async delete(fileUrl: string): Promise<void> {
    if (!fileUrl.startsWith(this.publicPath)) return

    // Strip public prefix
    const relativePath = fileUrl.slice(this.publicPath.length)
    const cleanRelative = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '')
    const fullPath = path.resolve(this.uploadDir, cleanRelative.startsWith(path.sep) ? cleanRelative.slice(1) : cleanRelative)

    // Strict containment assertion
    if (!fullPath.startsWith(this.uploadDir + path.sep)) {
      return
    }

    try {
      await unlink(fullPath)
    } catch {
      // File may not exist
    }
  }

  getUrl(fileName: string): string {
    const safeBase = path.basename(fileName)
    return `${this.publicPath}/${safeBase}`
  }

  private getSubDir(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'images'
    return 'media'
  }
}

// ---------------------------------------------------------------------------
// Provider singleton
// ---------------------------------------------------------------------------

let storageInstance: StorageProvider | null = null

export function getStorage(): StorageProvider {
  if (!storageInstance) {
    storageInstance = new LocalStorageProvider()
  }
  return storageInstance
}

// ---------------------------------------------------------------------------
// Public Media convenience functions
// ---------------------------------------------------------------------------

export async function uploadImage(file: Buffer, fileName: string, mimeType: string): Promise<UploadResult> {
  return getStorage().upload(file, fileName, mimeType)
}

export async function deleteImage(fileUrl: string): Promise<void> {
  return getStorage().delete(fileUrl)
}

export function getImageUrl(fileName: string): string {
  return getStorage().getUrl(fileName)
}
