// GET/POST/DELETE /api/projects/[id]/images
import { apiSuccess, apiCreated, apiUnauthorized, apiForbidden, apiNotFound, handleApiError, apiBadRequest } from '@/lib/api/response'
import { getProjectImages, addProjectImage, deleteProjectImage, getProjectById } from '@/lib/services/projects'
import { getApiSession, canManageContent } from '@/lib/auth/session'
import { createAuditLog } from '@/lib/services/audit'
import { uploadImage, deleteImage } from '@/lib/storage'
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from '@/lib/constants'
import { NextRequest } from 'next/server'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const images = await getProjectImages(id)
    return apiSuccess(images)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getApiSession()
    if (!session) return apiUnauthorized()
    if (!canManageContent(session.role)) return apiForbidden()

    const { id: projectId } = await params
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) return apiBadRequest('No file provided')
    if (!ALLOWED_IMAGE_TYPES.includes(file.type as any)) {
      return apiBadRequest('Invalid file type. Allowed: jpg, jpeg, png, webp')
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return apiBadRequest('File too large. Maximum size: 10MB')
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await uploadImage(buffer, file.name, file.type)

    const caption = formData.get('caption') as string | null
    const altText = formData.get('altText') as string | null

    const image = await addProjectImage({
      projectId,
      imageUrl: result.url,
      thumbnailUrl: result.thumbnailUrl,
      altText: altText || undefined,
      caption: caption || undefined,
      displayOrder: 0,
      featured: false,
    })

    await createAuditLog({
      userId: session.userId,
      action: 'Uploaded project image',
      entity: 'ProjectImage',
      entityId: image.id,
      metadata: { projectId, fileName: result.fileName },
    })

    return apiCreated(image)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getApiSession()
    if (!session) return apiUnauthorized()
    if (!canManageContent(session.role)) return apiForbidden()

    const { id: projectId } = await params
    const imageId = request.nextUrl.searchParams.get('imageId')
    if (!imageId) return apiBadRequest('imageId query parameter is required')

    const project = await getProjectById(projectId)
    if (!project) return apiNotFound('Project not found')

    const image = project.images.find((img: any) => img.id === imageId)
    if (!image) return apiNotFound('Image not found')

    await deleteImage(image.imageUrl)
    if (image.thumbnailUrl) {
      await deleteImage(image.thumbnailUrl).catch(() => {})
    }
    await deleteProjectImage(imageId)

    await createAuditLog({
      userId: session.userId,
      action: 'Deleted project image',
      entity: 'ProjectImage',
      entityId: imageId,
      metadata: { projectId },
    })

    return apiSuccess({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
