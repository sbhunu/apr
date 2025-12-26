/**
 * Document Storage Service
 * Handles document uploads to Supabase Storage with validation and integrity checks
 */

import { createClient } from '@/lib/supabase/client'
import { createClient as createServerClient } from '@/lib/supabase/server'
import {
  FileUploadOptions,
  FileUploadResult,
  DocumentMetadata,
} from './types'
import { validateFile, sanitizeFilename, formatFileSize } from './validation'
import { generateChecksum } from './checksum'
import { getStorageConfig } from './config'
import { ValidationError, SystemError } from '@/lib/errors/base'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'

/**
 * Upload document to Supabase Storage
 */
export async function uploadDocument(
  options: FileUploadOptions
): Promise<FileUploadResult> {
  return monitor('upload_document', async () => {
    const { file, folder, documentType, metadata, onProgress } = options

    // Get storage configuration
    const config = getStorageConfig(documentType)

    // Validate file
    const validation = validateFile(file, config)
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join('; '),
      }
    }

    try {
      const supabase = createClient()

      // Generate checksum
      const checksum = await generateChecksum(file)

      // Sanitize filename
      const sanitizedFilename = sanitizeFilename(file.name)

      // Create file path: {folder}/{timestamp}-{filename}
      const timestamp = Date.now()
      const filePath = `${folder}/${timestamp}-${sanitizedFilename}`

      // Upload file with progress tracking
      const uploadOptions: {
        cacheControl?: string
        upsert?: boolean
        contentType?: string
      } = {
        cacheControl: '3600', // 1 hour cache
        upsert: false,
        contentType: file.type || 'application/octet-stream',
      }

      // For large files, we'll need to handle chunked uploads
      // For now, using standard upload
      const { data, error } = await supabase.storage
        .from(config.bucket)
        .upload(filePath, file, uploadOptions)

      if (error) {
        logger.error('File upload failed', error, {
          filePath,
          fileName: file.name,
          fileSize: file.size,
        })
        return {
          success: false,
          error: error.message,
        }
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from(config.bucket).getPublicUrl(filePath)

      // Report progress
      onProgress?.(100)

      logger.info('Document uploaded successfully', {
        filePath,
        fileName: file.name,
        fileSize: file.size,
        checksum,
      })

      return {
        success: true,
        filePath: data.path,
        fileUrl: publicUrl,
        checksum,
        fileSize: file.size,
        mimeType: file.type,
      }
    } catch (error) {
      logger.error('Document upload exception', error as Error, {
        fileName: file.name,
      })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

/**
 * Upload document from server-side (for API routes)
 */
export async function uploadDocumentServer(
  options: FileUploadOptions & { userId: string }
): Promise<FileUploadResult> {
  return monitor('upload_document_server', async () => {
    const { file, folder, documentType, metadata, userId } = options

    // Get storage configuration
    const config = getStorageConfig(documentType)

    // Validate file
    const validation = validateFile(file, config)
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join('; '),
      }
    }

    try {
      const supabase = await createServerClient()

      // Generate checksum
      const checksum = await generateChecksum(file)

      // Sanitize filename
      const sanitizedFilename = sanitizeFilename(file.name)

      // Create file path
      const timestamp = Date.now()
      const filePath = `${folder}/${timestamp}-${sanitizedFilename}`

      // Convert File to ArrayBuffer for server-side upload
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Upload file
      const { data, error } = await supabase.storage
        .from(config.bucket)
        .upload(filePath, buffer, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || 'application/octet-stream',
        })

      if (error) {
        logger.error('Server file upload failed', error, {
          filePath,
          fileName: file.name,
          userId,
        })
        return {
          success: false,
          error: error.message,
        }
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from(config.bucket).getPublicUrl(filePath)

      logger.info('Server document uploaded successfully', {
        filePath,
        fileName: file.name,
        fileSize: file.size,
        checksum,
        userId,
      })

      return {
        success: true,
        filePath: data.path,
        fileUrl: publicUrl,
        checksum,
        fileSize: file.size,
        mimeType: file.type,
      }
    } catch (error) {
      logger.error('Server document upload exception', error as Error, {
        fileName: file.name,
        userId,
      })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

/**
 * Delete document from storage
 */
export async function deleteDocument(
  bucket: string,
  filePath: string
): Promise<{ success: boolean; error?: string }> {
  return monitor('delete_document', async () => {
    try {
      const supabase = createClient()

      const { error } = await supabase.storage.from(bucket).remove([filePath])

      if (error) {
        logger.error('Document deletion failed', error, {
          bucket,
          filePath,
        })
        return {
          success: false,
          error: error.message,
        }
      }

      logger.info('Document deleted successfully', {
        bucket,
        filePath,
      })

      return {
        success: true,
      }
    } catch (error) {
      logger.error('Document deletion exception', error as Error, {
        bucket,
        filePath,
      })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

/**
 * Get document URL
 */
export function getDocumentUrl(bucket: string, filePath: string): string {
  const supabase = createClient()
  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(filePath)
  return publicUrl
}

/**
 * Get signed URL for private documents
 */
export async function getSignedUrl(
  bucket: string,
  filePath: string,
  expiresIn: number = 3600
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn)

    if (error) {
      logger.error('Failed to create signed URL', error, {
        bucket,
        filePath,
      })
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
      url: data.signedUrl,
    }
  } catch (error) {
    logger.error('Signed URL creation exception', error as Error, {
      bucket,
      filePath,
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * List documents in a folder
 */
export async function listDocuments(
  bucket: string,
  folder: string
): Promise<{
  success: boolean
  files?: Array<{ name: string; size: number; updatedAt: string }>
  error?: string
}> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase.storage.from(bucket).list(folder)

    if (error) {
      logger.error('Failed to list documents', error, {
        bucket,
        folder,
      })
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
      files:
        data?.map((file) => ({
          name: file.name,
          size: file.metadata?.size || 0,
          updatedAt: file.updated_at || '',
        })) || [],
    }
  } catch (error) {
    logger.error('List documents exception', error as Error, {
      bucket,
      folder,
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

