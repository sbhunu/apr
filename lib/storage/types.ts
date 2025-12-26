/**
 * Storage Types
 * Type definitions for document storage operations
 */

/**
 * File upload options
 */
export interface FileUploadOptions {
  file: File
  folder: string
  documentType: string
  metadata?: Record<string, unknown>
  onProgress?: (progress: number) => void
}

/**
 * File upload result
 */
export interface FileUploadResult {
  success: boolean
  filePath?: string
  fileUrl?: string
  checksum?: string
  fileSize?: number
  mimeType?: string
  error?: string
}

/**
 * File validation result
 */
export interface FileValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Storage configuration
 */
export interface StorageConfig {
  bucket: string
  maxFileSize: number // in bytes
  allowedMimeTypes: string[]
  allowedExtensions: string[]
}

/**
 * Document metadata
 */
export interface DocumentMetadata {
  fileName: string
  filePath: string
  fileSize: number
  mimeType: string
  checksum: string
  documentType: string
  uploadedBy: string
  uploadedAt: string
  metadata?: Record<string, unknown>
}

